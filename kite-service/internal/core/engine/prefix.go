package engine

import (
	"context"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

const appSettingsCacheTTL = 30 * time.Second

// handlePrefixCommand tries to interpret a message as a prefix or mention
// command and, if it matches one of the app's commands, runs its flow.
func (a *App) handlePrefixCommand(appID string, session *state.State, e *gateway.MessageCreateEvent) {
	if e.Author.Bot || e.Content == "" {
		return
	}

	me, err := session.Me()
	if err != nil {
		return
	}

	content := strings.TrimSpace(e.Content)
	var rest string
	matched := false

	// A bot mention always works: Discord delivers message content when the bot
	// is mentioned even without the MESSAGE_CONTENT intent.
	for _, m := range []string{"<@" + me.ID.String() + ">", "<@!" + me.ID.String() + ">"} {
		if strings.HasPrefix(content, m) {
			rest = strings.TrimSpace(content[len(m):])
			matched = true
			break
		}
	}

	// A custom prefix only works when the app has the message content intent;
	// without it, non-mention messages arrive with empty content anyway.
	if !matched {
		settings := a.prefixSettings(context.Background())
		if settings != nil && settings.EnablePrefixCommands && settings.CommandPrefix != "" &&
			strings.HasPrefix(content, settings.CommandPrefix) {
			rest = strings.TrimSpace(content[len(settings.CommandPrefix):])
			matched = true
		}
	}

	if !matched || rest == "" {
		return
	}

	name, argsText := splitFirstToken(rest)
	name = strings.ToLower(name)

	a.RLock()
	var cmd *Command
	for _, c := range a.commands {
		if c.cmd.Name == name {
			cmd = c
			break
		}
	}
	a.RUnlock()

	if cmd == nil {
		return
	}

	args := parseTextArgs(cmd.flow, argsText)
	links := entityLinks{CommandID: null.NewString(cmd.cmd.ID, true)}

	go a.env.executeTextCommand(context.Background(), appID, cmd.flow, session, e, args, links)
}

// prefixSettings returns the app's settings, cached for a short TTL to avoid a
// database query on every message.
func (a *App) prefixSettings(ctx context.Context) *model.AppSettings {
	a.RLock()
	if a.settingsCache != nil && time.Since(a.settingsCacheAt) < appSettingsCacheTTL {
		s := a.settingsCache
		a.RUnlock()
		return s
	}
	a.RUnlock()

	if a.env.AppSettingsStore == nil {
		return nil
	}

	s, err := a.env.AppSettingsStore.AppSettings(ctx, a.id)
	if err != nil {
		slog.With("error", err).With("app_id", a.id).Error("failed to load app settings")
		return nil
	}

	a.Lock()
	a.settingsCache = s
	a.settingsCacheAt = time.Now()
	a.Unlock()

	return s
}

func splitFirstToken(s string) (string, string) {
	s = strings.TrimSpace(s)
	idx := strings.IndexAny(s, " \t\n")
	if idx == -1 {
		return s, ""
	}
	return s[:idx], strings.TrimSpace(s[idx+1:])
}

// parseTextArgs maps positional text tokens to the command's declared arguments,
// coercing primitive types and extracting snowflake IDs from mentions.
func parseTextArgs(node *flow.CompiledFlowNode, text string) map[string]any {
	args := make(map[string]any)

	options := node.CommandArguments()
	if len(options) == 0 {
		return args
	}

	tokens := tokenizeArgs(text)

	for i, opt := range options {
		if i >= len(tokens) {
			break
		}

		raw := tokens[i]
		// The last declared argument greedily consumes the remaining tokens, so
		// free-text arguments (a message, a reason, ...) keep their spaces.
		if i == len(options)-1 && len(tokens) > len(options) {
			raw = strings.Join(tokens[i:], " ")
		}

		args[opt.Name()] = coerceArg(raw, opt.Type())
	}

	return args
}

func coerceArg(raw string, t discord.CommandOptionType) any {
	switch t {
	case discord.IntegerOptionType:
		if n, err := strconv.ParseInt(raw, 10, 64); err == nil {
			return n
		}
		return raw
	case discord.NumberOptionType:
		if f, err := strconv.ParseFloat(raw, 64); err == nil {
			return f
		}
		return raw
	case discord.BooleanOptionType:
		return strings.EqualFold(raw, "true") || raw == "1" || strings.EqualFold(raw, "yes")
	case discord.UserOptionType, discord.RoleOptionType, discord.ChannelOptionType, discord.MentionableOptionType:
		return extractSnowflake(raw)
	default:
		return raw
	}
}

// extractSnowflake pulls the numeric ID out of a Discord mention (<@id>, <@!id>,
// <@&id>, <#id>) or returns the raw value if it's already a plain ID.
func extractSnowflake(raw string) string {
	raw = strings.TrimSpace(raw)
	for _, prefix := range []string{"<@&", "<@!", "<@", "<#"} {
		if strings.HasPrefix(raw, prefix) {
			raw = strings.TrimPrefix(raw, prefix)
			break
		}
	}
	raw = strings.TrimSuffix(raw, ">")
	return raw
}

// tokenizeArgs splits text into tokens by whitespace, keeping double-quoted
// segments together.
func tokenizeArgs(s string) []string {
	var tokens []string
	var cur strings.Builder
	inQuote := false

	flush := func() {
		if cur.Len() > 0 {
			tokens = append(tokens, cur.String())
			cur.Reset()
		}
	}

	for _, r := range s {
		switch {
		case r == '"':
			inQuote = !inQuote
		case (r == ' ' || r == '\t' || r == '\n') && !inQuote:
			flush()
		default:
			cur.WriteRune(r)
		}
	}
	flush()

	return tokens
}
