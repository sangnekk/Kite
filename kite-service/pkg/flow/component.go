package flow

import (
	"errors"
	"fmt"
	"slices"
	"strconv"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/diamondburned/arikawa/v3/utils/json/option"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
)

// Handle names of the branches of select menu options. They have to match the
// handles rendered by the flow editor in kite-web (FlowNodeEntryComponentSelect
// and FlowNodeActionMessage).

// entrySelectOptionHandle is the handle of an option on entry_component_select.
func entrySelectOptionHandle(optionID int, selected bool) string {
	if selected {
		return fmt.Sprintf("option_%d", optionID)
	}
	return fmt.Sprintf("option_%d_unselected", optionID)
}

// messageComponentHandle is the handle of a component on a message node.
func messageComponentHandle(componentID int) string {
	return fmt.Sprintf("component_%d", componentID)
}

// messageSelectOptionHandle is the handle of an option of a select on a
// message node.
func messageSelectOptionHandle(componentID int) func(optionID int, selected bool) string {
	return func(optionID int, selected bool) string {
		if selected {
			return fmt.Sprintf("component_%d_option_%d", componentID, optionID)
		}
		return fmt.Sprintf("component_%d_option_%d_unselected", componentID, optionID)
	}
}

const (
	maxGeneratedSelectOptions   = message.MaxSelectOptions
	defaultComponentDenyMessage = "Bạn không có quyền sử dụng thành phần này."
)

// BindComponent sets the configuration of the interacted component and makes
// the configured option labels available as {{select.options}}.
func (c *FlowContext) BindComponent(comp *message.ComponentData) {
	c.Component = comp
	if comp == nil {
		return
	}

	interaction := c.Data.Interaction()
	if interaction == nil {
		return
	}

	if env := eval.NewSelectEnv(interaction, selectOptionInfos(comp)); env != nil {
		c.EvalCtx.Env["select"] = env
	}
}

func selectOptionInfos(comp *message.ComponentData) []eval.SelectOptionInfo {
	if comp == nil || !comp.IsStringSelect() {
		return nil
	}

	infos := make([]eval.SelectOptionInfo, len(comp.Options))
	for i, o := range comp.Options {
		infos[i] = eval.SelectOptionInfo{
			Value:       o.Value,
			Label:       o.Label,
			Description: o.Description,
			Index:       i,
		}
	}
	return infos
}

// bindOption exposes the option whose branch is running as {{option}}. The
// returned function restores the previous value.
func (c *FlowContext) bindOption(o message.ComponentSelectOptionData, index int) func() {
	prev, hadPrev := c.EvalCtx.Env["option"]
	c.EvalCtx.Env["option"] = &eval.SelectOptionEnv{
		Value:       o.Value,
		Label:       o.Label,
		Description: o.Description,
		Index:       index,
	}

	return func() {
		if hadPrev {
			c.EvalCtx.Env["option"] = prev
		} else {
			delete(c.EvalCtx.Env, "option")
		}
	}
}

// selectedValues returns the values of a string select interaction, or nil if
// the interaction isn't one.
func selectedValues(ctx *FlowContext) []string {
	interaction := ctx.Data.Interaction()
	if interaction == nil {
		return nil
	}

	data, ok := interaction.Data.(*discord.StringSelectInteraction)
	if !ok {
		return nil
	}
	return data.Values
}

// executeSelectOptionBranches runs, in the configured order, the branch of every
// selected option of a string select and the "not selected" branch of every
// other option. {{option}} is bound while an option's branch runs.
func (n *CompiledFlowNode) executeSelectOptionBranches(ctx *FlowContext, comp *message.ComponentData, handle func(optionID int, selected bool) string) error {
	if comp == nil || !comp.IsStringSelect() {
		return nil
	}

	values := selectedValues(ctx)
	_, max := comp.ValueLimits()
	if len(values) > max {
		// Only possible if the configuration changed since the message was sent.
		ctx.Log.CreateLogEntry(ctx, provider.LogLevelWarn, fmt.Sprintf(
			"Select menu received %d values but allows at most %d; ignoring the rest", len(values), max,
		))
		values = values[:max]
	}

	for _, v := range values {
		if _, ok := comp.OptionByValue(v); !ok && comp.OptionsSource == nil {
			ctx.Log.CreateLogEntry(ctx, provider.LogLevelWarn, fmt.Sprintf(
				"Select menu value %q doesn't match any configured option", v,
			))
		}
	}

	for i, o := range comp.Options {
		h := handle(o.ID, slices.Contains(values, o.Value))
		if _, ok := n.Children.Handles[h]; !ok {
			continue
		}

		restore := ctx.bindOption(o, i)
		err := n.ExecuteChildrenByHandle(ctx, h)
		restore()
		if err != nil {
			return err
		}
	}

	return nil
}

// componentBranches returns the nodes that may run for a component interaction:
// the component's own branch followed by its option branches. They're used to
// predict the first response of the flow.
func (n *CompiledFlowNode) componentBranches(defaultBranch []*CompiledFlowNode, comp *message.ComponentData, handle func(optionID int, selected bool) string) []*CompiledFlowNode {
	nodes := slices.Clone(defaultBranch)
	if comp == nil || !comp.IsStringSelect() {
		return nodes
	}

	for _, o := range comp.Options {
		nodes = append(nodes, n.Children.Handles[handle(o.ID, true)]...)
	}
	return nodes
}

// errLoopExited stops a for-each loop early without being reported as an error.
var errLoopExited = errors.New("loop exited")

// maxLoopItems bounds "for each" loops; the operation limit of the flow applies
// on top of it.
const maxLoopItems = 1000

// forEachItem calls fn once per item with {{item}} and {{index}} bound,
// restoring their previous values afterwards.
func forEachItem(ctx *FlowContext, items []thing.Thing, fn func() error) error {
	prevItem, hadItem := ctx.EvalCtx.Env["item"]
	prevIndex, hadIndex := ctx.EvalCtx.Env["index"]
	defer func() {
		if hadItem {
			ctx.EvalCtx.Env["item"] = prevItem
		} else {
			delete(ctx.EvalCtx.Env, "item")
		}
		if hadIndex {
			ctx.EvalCtx.Env["index"] = prevIndex
		} else {
			delete(ctx.EvalCtx.Env, "index")
		}
	}()

	for i, item := range items {
		if i >= maxLoopItems {
			break
		}

		ctx.EvalCtx.Env["item"] = eval.NewThingEnv(item)
		ctx.EvalCtx.Env["index"] = i

		if err := fn(); err != nil {
			if errors.Is(err, errLoopExited) {
				return nil
			}
			return err
		}
	}
	return nil
}

// respondComponentUnavailable tells the user that the component they used no
// longer exists, instead of letting Discord show "This interaction failed".
func respondComponentUnavailable(ctx *FlowContext, interaction *discord.InteractionEvent) error {
	_, err := ctx.Discord.CreateInteractionResponse(ctx, interaction.ID, interaction.Token, api.InteractionResponse{
		Type: api.MessageInteractionWithSource,
		Data: &api.InteractionResponseData{
			Content: option.NewNullableString("Thành phần này không còn khả dụng."),
			Flags:   discord.EphemeralMessage,
		},
	})
	return err
}

// checkComponentAccess enforces the access rule of the interacted component. It
// returns false (after telling the user) if the user isn't allowed to use it.
func checkComponentAccess(ctx *FlowContext, comp *message.ComponentData) (bool, error) {
	if comp == nil || comp.Access == nil {
		return true, nil
	}

	interaction := ctx.Data.Interaction()
	if interaction == nil {
		return true, nil
	}

	if componentAccessAllowed(ctx, interaction, comp.Access) {
		return true, nil
	}

	content := defaultComponentDenyMessage
	if comp.Access.DenyMessage != "" {
		// A broken placeholder must not leave the user without an answer.
		msg, err := ctx.EvalTemplate(comp.Access.DenyMessage)
		if err != nil {
			ctx.Log.CreateLogEntry(ctx, provider.LogLevelWarn, fmt.Sprintf("Failed to evaluate the access deny message: %v", err))
		} else if s := msg.String(); s != "" {
			content = s
		}
	}

	_, err := ctx.Discord.CreateInteractionResponse(ctx, interaction.ID, interaction.Token, api.InteractionResponse{
		Type: api.MessageInteractionWithSource,
		Data: &api.InteractionResponseData{
			Content: option.NewNullableString(content),
			Flags:   discord.EphemeralMessage,
		},
	})
	if err != nil {
		return false, fmt.Errorf("failed to respond to denied interaction: %w", err)
	}

	return false, nil
}

func componentAccessAllowed(ctx *FlowContext, interaction *discord.InteractionEvent, access *message.ComponentAccessData) bool {
	switch access.Mode {
	case message.ComponentAccessModeRoles:
		if interaction.Member == nil {
			return false
		}
		for _, roleID := range interaction.Member.RoleIDs {
			if slices.Contains(access.RoleIDs, roleID.String()) {
				return true
			}
		}
		return false
	case message.ComponentAccessModePermissions:
		if interaction.Member == nil {
			return false
		}
		raw, err := strconv.ParseUint(access.Permissions, 10, 64)
		if err != nil {
			return false
		}
		have := interaction.Member.Permissions
		return have.Has(discord.PermissionAdministrator) || have.Has(discord.Permissions(raw))
	case message.ComponentAccessModeInvoker:
		// Only meaningful for messages sent by flows; resume points created
		// before the invoker was tracked fail open.
		if ctx.InvokerUserID == "" {
			return true
		}
		return ctx.Data.UserID().String() == ctx.InvokerUserID
	default:
		return true
	}
}

// expandOptionSources generates the options of string selects that have an
// options source, evaluating its templates once per list item.
func expandOptionSources(ctx *FlowContext, data *message.MessageData) error {
	var err error
	data.WalkComponents(func(c *message.ComponentData) {
		if err != nil || !c.IsStringSelect() || c.OptionsSource == nil {
			return
		}
		c.Options, err = generateSelectOptions(ctx, c.OptionsSource)
		c.OptionsSource = nil
	})
	return err
}

func generateSelectOptions(ctx *FlowContext, source *message.ComponentOptionsSourceData) ([]message.ComponentSelectOptionData, error) {
	list, err := ctx.EvalTemplate(source.Items)
	if err != nil {
		return nil, fmt.Errorf("failed to evaluate select menu options: %w", err)
	}

	var options []message.ComponentSelectOptionData
	seen := make(map[string]bool)
	err = forEachItem(ctx, list.AsList(), func() error {
		if len(options) >= maxGeneratedSelectOptions {
			return errLoopExited
		}

		label, err := evalTruncated(ctx, source.Label)
		if err != nil {
			return err
		}
		value, err := evalTruncated(ctx, source.Value)
		if err != nil {
			return err
		}
		description, err := evalTruncated(ctx, source.Description)
		if err != nil {
			return err
		}

		// Discord requires a label and a unique value for every option.
		if label == "" || value == "" || seen[value] {
			return nil
		}
		seen[value] = true

		options = append(options, message.ComponentSelectOptionData{
			ID:          len(options) + 1,
			Label:       label,
			Value:       value,
			Description: description,
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	if len(options) == 0 {
		return nil, &FlowError{
			Code:    FlowNodeErrorUnknown,
			Message: "the list for the select menu options is empty",
		}
	}

	return options, nil
}

func evalTruncated(ctx *FlowContext, template string) (string, error) {
	if template == "" {
		return "", nil
	}

	res, err := ctx.EvalTemplate(template)
	if err != nil {
		return "", err
	}

	s := []rune(res.String())
	if len(s) > message.MaxSelectOptionTextLength {
		s = s[:message.MaxSelectOptionTextLength]
	}
	return string(s), nil
}

// resetComponentSelection re-sends the components of the message the select is
// attached to, so the menu shows its placeholder again. Without it Discord keeps
// showing the last selection and selecting it again isn't sent to the bot.
func resetComponentSelection(ctx *FlowContext, interaction *discord.InteractionEvent, responded bool) error {
	msg := interaction.Message
	components := msg.Components

	if !responded {
		_, err := ctx.Discord.CreateInteractionResponse(ctx, interaction.ID, interaction.Token, api.InteractionResponse{
			Type: api.UpdateMessage,
			Data: &api.InteractionResponseData{
				Components: &components,
			},
		})
		return err
	}

	if msg.Flags&discord.EphemeralMessage != 0 {
		// Ephemeral messages can only be edited through the interaction, whose
		// response is already used by the flow.
		return nil
	}

	_, err := ctx.Discord.EditMessage(ctx, msg.ChannelID, msg.ID, api.EditMessageData{
		Components: &components,
	})
	return err
}
