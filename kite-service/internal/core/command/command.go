package command

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
)

// slashCommandCap is Discord's hard limit on global slash commands per app.
const slashCommandCap = 100

// Discord's documented limits for chat-input commands. Discord validates the
// whole bulk-overwrite atomically and rejects all of it if any single command
// violates a limit, so we check these locally and drop offenders instead (see
// validateDiscordCommand). Save-time validation already enforces per-node name
// and description rules; these are the aggregate limits it can't see.
const (
	maxCommandOptions = 25  // options per command/subcommand, and subcommands per group
	maxDescriptionLen = 100 // command + option description length
)

// commandNamePartRe matches one segment of a Discord chat-input command name (the
// name itself, or each space-separated subcommand part). It mirrors Discord's
// documented regex `^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$` (Go RE2 spells
// those scripts \p{Devanagari} and \p{Thai}). Discord rejects the WHOLE
// bulk-overwrite if any name is invalid, so we validate locally and skip
// offenders instead. Note: Discord's server occasionally rejects names its own
// documented regex accepts; those rare cases would still fail the deploy.
var commandNamePartRe = regexp.MustCompile(`^[-_\p{L}\p{N}\p{Devanagari}\p{Thai}]{1,32}$`)

// validCommandName reports whether a (possibly nested) command name is accepted
// by Discord: every space-separated part must match the charset and be lowercase.
func validCommandName(name string) bool {
	if name == "" {
		return false
	}
	for _, part := range strings.Split(name, " ") {
		if !commandNamePartRe.MatchString(part) || part != strings.ToLower(part) {
			return false
		}
	}
	return true
}

func (m *CommandManager) DeployCommandsForApp(ctx context.Context, appID string) error {
	deploymentStartedAt := time.Now().UTC()

	commands, stats, err := m.appCommands(ctx, appID)
	if err != nil {
		return fmt.Errorf("failed to get commands for app: %w", err)
	}

	// Guard the blast radius of a systemic compile failure. BulkOverwriteCommands
	// (below) is a full replace, not an incremental update, so deploying only the
	// survivors of a mass failure would erase every working command from Discord.
	// If the app has stored commands but NONE of them compiled, that's almost
	// always a compiler/schema regression rather than independent broken drafts —
	// refuse to overwrite. A partial failure still deploys the commands that
	// compiled (the intended skip-broken-draft behavior).
	if stats.total > 0 && stats.compiled == 0 {
		slog.Error(
			"aborting command deploy: every command failed to compile",
			slog.String("app_id", appID),
			slog.Int("failed", stats.failed),
		)
		_ = m.logStore.CreateLogEntry(ctx, model.LogEntry{
			AppID:     appID,
			Level:     model.LogLevelError,
			Message:   fmt.Sprintf("Hủy triển khai: tất cả %d lệnh đều không biên dịch được, nên không ghi đè để tránh xóa toàn bộ lệnh trên Discord. Hãy kiểm tra lại các lệnh.", stats.total),
			CreatedAt: time.Now().UTC(),
		})
		return fmt.Errorf("aborting deploy for app %s: all %d command(s) failed to compile", appID, stats.total)
	}

	// Some commands failed but others survived: deploy proceeds, but flag a high
	// failure rate at error level since it may also signal a regression.
	if stats.failed > 0 && stats.failed >= stats.compiled {
		slog.Error(
			"high command compile-failure rate during deploy",
			slog.String("app_id", appID),
			slog.Int("failed", stats.failed),
			slog.Int("compiled", stats.compiled),
		)
	}

	cmdData, err := mergeCommands(commands)
	if err != nil {
		return fmt.Errorf("failed to merge commands: %w", err)
	}

	// Drop commands that violate Discord's schema (option counts, duplicate option
	// names, description length) so one bad command can't get the entire
	// bulk-overwrite rejected. This runs after merge because the limits apply to
	// the merged shape (e.g. many "config <x>" subcommands collapse into one root).
	mergedCount := len(cmdData)
	validCmdData := make([]api.CreateCommandData, 0, mergedCount)
	for _, cmd := range cmdData {
		if err := validateDiscordCommand(cmd); err != nil {
			m.warnSkippedCommand(ctx, appID, cmd.Name, fmt.Sprintf("không đạt ràng buộc Discord (%s)", err))
			continue
		}
		validCmdData = append(validCmdData, cmd)
	}
	// If validation dropped commands and nothing valid remains, refuse to overwrite
	// rather than wiping every command off Discord (same blast-radius guard as a
	// mass compile failure).
	if len(validCmdData) == 0 && mergedCount > 0 {
		slog.Error(
			"aborting command deploy: all commands failed Discord validation",
			slog.String("app_id", appID),
			slog.Int("dropped", mergedCount),
		)
		_ = m.logStore.CreateLogEntry(ctx, model.LogEntry{
			AppID:     appID,
			Level:     model.LogLevelError,
			Message:   fmt.Sprintf("Hủy triển khai: tất cả %d lệnh đều không đạt ràng buộc của Discord, nên không ghi đè để tránh xóa toàn bộ lệnh. Hãy kiểm tra lại các lệnh.", mergedCount),
			CreatedAt: time.Now().UTC(),
		})
		return fmt.Errorf("aborting deploy for app %s: all %d command(s) failed Discord validation", appID, mergedCount)
	}
	cmdData = validCmdData

	app, err := m.appStore.App(ctx, appID)
	if err != nil {
		return fmt.Errorf("failed to get app: %w", err)
	}

	if !app.Enabled {
		return nil
	}

	// Discord rejects the whole bulk-overwrite if it exceeds 100 slash commands,
	// which would drop every command. Cap defensively and warn the app instead.
	if len(cmdData) > slashCommandCap {
		dropped := len(cmdData) - slashCommandCap
		cmdData = cmdData[:slashCommandCap]

		slog.Warn(
			"slash command cap exceeded, dropping extra commands",
			slog.String("app_id", appID),
			slog.Int("dropped", dropped),
		)
		_ = m.logStore.CreateLogEntry(ctx, model.LogEntry{
			AppID:     appID,
			Level:     model.LogLevelWarn,
			Message:   fmt.Sprintf("Discord chỉ cho phép %d lệnh slash; %d lệnh không được đăng ký. Hãy chuyển các lệnh thừa sang prefix.", slashCommandCap, dropped),
			CreatedAt: time.Now().UTC(),
		})
	}

	appId, err := strconv.ParseUint(app.DiscordID, 10, 64)
	if err != nil {
		return fmt.Errorf("failed to parse app ID: %w", err)
	}

	token, err := m.tokenCrypt.DecryptString(app.DiscordToken)
	if err != nil {
		return fmt.Errorf("failed to decrypt token: %w", err)
	}

	client := api.NewClient("Bot " + token).WithContext(ctx)

	_, err = client.BulkOverwriteCommands(discord.AppID(appId), cmdData)
	if err != nil {
		return fmt.Errorf("failed to deploy commands: %w", err)
	}

	err = m.commandStore.UpdateCommandsLastDeployedAt(ctx, appID, deploymentStartedAt)
	if err != nil {
		return fmt.Errorf("failed to update last deployed at: %w", err)
	}

	err = m.pluginInstanceStore.UpdatePluginInstancesLastDeployedAt(ctx, appID, deploymentStartedAt)
	if err != nil {
		return fmt.Errorf("failed to update last deployed at: %w", err)
	}

	return nil
}

// commandCompileStats summarizes how an app's stored commands fared during
// compilation, so DeployCommandsForApp can refuse to wipe Discord on a systemic
// failure (see the guard there). It counts the user's flow commands only, not
// plugin-provided commands.
type commandCompileStats struct {
	total    int // stored flow commands considered
	compiled int // compiled successfully (whether slash- or prefix-only)
	failed   int // failed flow.CompileCommand
}

func (m *CommandManager) appCommands(ctx context.Context, appID string) ([]api.CreateCommandData, commandCompileStats, error) {
	commands, err := m.commandStore.CommandsByApp(ctx, appID)
	if err != nil {
		return nil, commandCompileStats{}, fmt.Errorf("failed to get commands by app: %w", err)
	}

	pluginInstances, err := m.pluginInstanceStore.PluginInstancesByApp(ctx, appID)
	if err != nil {
		return nil, commandCompileStats{}, fmt.Errorf("failed to get plugin instances by app: %w", err)
	}

	stats := commandCompileStats{total: len(commands)}
	commandNames := make([]string, 0, len(commands))
	res := make([]api.CreateCommandData, 0, len(commands))
	for _, command := range commands {
		node, err := flow.CompileCommand(command.FlowSource)
		if err != nil {
			// A single broken command (e.g. an incomplete draft, or one created by
			// the AI assistant) must not block deploying every other command — skip
			// it and tell the user via a log entry. A mass failure is caught by the
			// guard in DeployCommandsForApp via the returned stats.
			stats.failed++
			m.warnSkippedCommand(ctx, appID, command.Name, "không biên dịch được")
			continue
		}
		stats.compiled++

		// Prefix-only commands are not registered as Discord slash commands.
		if !node.CommandSlashEnabled() {
			continue
		}

		name := node.CommandName()
		// Discord rejects the entire bulk-overwrite if any single name is invalid,
		// so drop the offender here rather than failing the whole deploy.
		if !validCommandName(name) {
			m.warnSkippedCommand(ctx, appID, name, "tên không hợp lệ (chỉ chữ thường, số, '-' và '_', tối đa 32 ký tự mỗi phần)")
			continue
		}

		data := node.CommandData()
		res = append(res, api.CreateCommandData{
			Name:                     data.Name,
			Description:              data.Description,
			Options:                  data.Options,
			DefaultMemberPermissions: data.DefaultMemberPermissions,
			Contexts:                 node.CommandContexts(),
			IntegrationTypes:         node.CommandIntegrations(),
		})
		commandNames = append(commandNames, name)
	}

	for _, pluginInstance := range pluginInstances {
		plugin := m.pluginRegistry.Plugin(pluginInstance.PluginID)
		if plugin == nil {
			slog.Warn("Unknown plugin in deploy manager", slog.String("plugin_id", pluginInstance.PluginID))
			continue
		}

		for _, command := range plugin.Commands() {
			if slices.Contains(pluginInstance.EnabledResourceIDs, command.ID) {
				commandNames = append(commandNames, command.ID)
				res = append(res, command.Data)
			}
		}
	}

	// Drop commands whose names collide with an already-kept command instead of
	// failing the whole deploy: Discord rejects the entire bulk-overwrite on a name
	// clash. Greedily keep the first occurrence (commands and plugin commands are
	// parallel in res/commandNames), so one duplicate can't block the rest.
	keptRes := make([]api.CreateCommandData, 0, len(res))
	keptNames := make([]string, 0, len(commandNames))
	for i, name := range commandNames {
		conflict := false
		for _, kept := range keptNames {
			if ok, reason := commandNamesConflict(name, kept); ok {
				m.warnSkippedCommand(ctx, appID, name, fmt.Sprintf("xung đột tên với lệnh khác (%s)", reason))
				conflict = true
				break
			}
		}
		if conflict {
			continue
		}
		keptNames = append(keptNames, name)
		keptRes = append(keptRes, res[i])
	}

	return keptRes, stats, nil
}

// warnSkippedCommand logs (server + user-facing app log) that a command was left
// out of the Discord deploy, so a skipped command isn't silently missing.
func (m *CommandManager) warnSkippedCommand(ctx context.Context, appID, name, reason string) {
	slog.Warn(
		"skipping invalid command from deploy",
		slog.String("app_id", appID),
		slog.String("command", name),
		slog.String("reason", reason),
	)
	_ = m.logStore.CreateLogEntry(ctx, model.LogEntry{
		AppID:     appID,
		Level:     model.LogLevelWarn,
		Message:   fmt.Sprintf("Lệnh %q không được đăng ký lên Discord: %s.", name, reason),
		CreatedAt: time.Now().UTC(),
	})
}

// commandNamesConflict reports whether two (possibly nested) command names would
// collide in Discord's command tree — exact duplicates, or a mix of nested and
// unnested commands sharing a path. Names that merge cleanly (e.g. "config set"
// and "config get") do NOT conflict; mergeCommands combines those into one root.
func commandNamesConflict(aName, bName string) (bool, string) {
	if aName == "" || bName == "" {
		return false, ""
	}

	aParts := strings.Split(aName, " ")
	bParts := strings.Split(bName, " ")

	if aParts[0] != bParts[0] {
		return false, ""
	}

	if len(aParts) == 1 || len(bParts) == 1 {
		// Same root, but at least one is the bare command: e.g. "config" vs
		// "config set" (mixed nested/unnested) or "config" vs "config".
		return true, "trùng tên lệnh"
	}

	if len(aParts)+len(bParts) == 3 {
		// One has a subcommand and the other doesn't.
		return true, "lệnh lồng và không lồng bị trộn"
	}

	if aParts[1] != bParts[1] {
		return false, ""
	}

	if len(aParts) == 2 || len(bParts) == 2 {
		return true, "trùng tên subcommand"
	}

	if len(aParts)+len(bParts) == 5 {
		return true, "subcommand lồng và không lồng bị trộn"
	}

	if aParts[2] == bParts[2] {
		return true, "trùng tên subcommand"
	}

	return false, ""
}

// validateDiscordCommand checks a fully-merged command against the Discord schema
// constraints that save-time per-node validation can't see (aggregate option
// counts, sibling-name uniqueness, description length). Discord validates the
// whole bulk-overwrite atomically, so DeployCommandsForApp drops offenders rather
// than letting one bad command block the deploy.
func validateDiscordCommand(cmd api.CreateCommandData) error {
	if l := len(cmd.Description); l < 1 || l > maxDescriptionLen {
		return fmt.Errorf("mô tả phải dài 1-%d ký tự (hiện %d)", maxDescriptionLen, l)
	}
	return validateCommandOptions(cmd.Options)
}

// validateCommandOptions validates one level of options: count, sibling-name
// uniqueness, and recurses into subcommand groups/subcommands.
func validateCommandOptions(opts discord.CommandOptions) error {
	if len(opts) > maxCommandOptions {
		return fmt.Errorf("quá nhiều tùy chọn: %d (tối đa %d)", len(opts), maxCommandOptions)
	}

	seen := make(map[string]struct{}, len(opts))
	for _, o := range opts {
		name := o.Name()
		if _, dup := seen[name]; dup {
			return fmt.Errorf("trùng tên tùy chọn %q", name)
		}
		seen[name] = struct{}{}

		switch opt := o.(type) {
		case *discord.SubcommandGroupOption:
			if l := len(opt.Description); l < 1 || l > maxDescriptionLen {
				return fmt.Errorf("nhóm subcommand %q: mô tả phải dài 1-%d ký tự", name, maxDescriptionLen)
			}
			if len(opt.Subcommands) > maxCommandOptions {
				return fmt.Errorf("nhóm subcommand %q có quá nhiều subcommand: %d", name, len(opt.Subcommands))
			}
			subSeen := make(map[string]struct{}, len(opt.Subcommands))
			for _, sub := range opt.Subcommands {
				if _, dup := subSeen[sub.Name()]; dup {
					return fmt.Errorf("trùng tên subcommand %q", sub.Name())
				}
				subSeen[sub.Name()] = struct{}{}
				if err := validateSubcommandOption(sub); err != nil {
					return err
				}
			}
		case *discord.SubcommandOption:
			if err := validateSubcommandOption(opt); err != nil {
				return err
			}
		}
	}

	return nil
}

// validateSubcommandOption validates a subcommand's description and its value
// options (count + sibling-name uniqueness).
func validateSubcommandOption(sub *discord.SubcommandOption) error {
	if l := len(sub.Description); l < 1 || l > maxDescriptionLen {
		return fmt.Errorf("subcommand %q: mô tả phải dài 1-%d ký tự", sub.Name(), maxDescriptionLen)
	}
	if len(sub.Options) > maxCommandOptions {
		return fmt.Errorf("subcommand %q có quá nhiều tùy chọn: %d", sub.Name(), len(sub.Options))
	}
	seen := make(map[string]struct{}, len(sub.Options))
	for _, v := range sub.Options {
		if _, dup := seen[v.Name()]; dup {
			return fmt.Errorf("trùng tên tùy chọn %q trong subcommand %q", v.Name(), sub.Name())
		}
		seen[v.Name()] = struct{}{}
	}
	return nil
}

func mergeCommands(commands []api.CreateCommandData) ([]api.CreateCommandData, error) {
	rootCMDs := make(map[string]*api.CreateCommandData)

	// Merge root commands
	for _, command := range commands {
		// TODO: think about how to handle different configs for root cmd
		if c, ok := rootCMDs[command.Name]; ok {
			c.Options = append(c.Options, command.Options...)
		} else {
			rootCMDs[command.Name] = &command
		}
	}

	// Merge sub command groups
	for _, command := range rootCMDs {
		groups := make(map[string]*discord.SubcommandGroupOption)
		args := make([]discord.CommandOption, 0, len(command.Options))

		for _, option := range command.Options {
			if g, ok := option.(*discord.SubcommandGroupOption); ok {
				if group, ok := groups[g.Name()]; ok {
					group.Subcommands = append(group.Subcommands, g.Subcommands...)
				} else {
					groups[g.Name()] = g
				}
			} else {
				args = append(args, option)
			}
		}

		command.Options = args
		for _, group := range groups {
			command.Options = append(command.Options, group)
		}
	}

	res := make([]api.CreateCommandData, 0, len(rootCMDs))
	for _, command := range rootCMDs {
		res = append(res, *command)
	}

	return res, nil
}
