package flow

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/kitecloud/kite/kite-service/pkg/thing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type recordingLogProvider struct {
	entries []string
}

func (p *recordingLogProvider) CreateLogEntry(ctx context.Context, level provider.LogLevel, message string) {
	p.entries = append(p.entries, string(level)+":"+message)
}

type selectTestContextData struct {
	TestContextData
	interaction *discord.InteractionEvent
}

func (d *selectTestContextData) Interaction() *discord.InteractionEvent { return d.interaction }

func (d *selectTestContextData) UserID() discord.UserID { return d.interaction.SenderID() }

type selectTest struct {
	ctx     *FlowContext
	discord *componentTestDiscordProvider
	logs    *recordingLogProvider
}

func newSelectTest(t *testing.T, interaction *discord.InteractionEvent, state *FlowContextState) *selectTest {
	t.Helper()

	if interaction.User == nil && interaction.Member == nil {
		interaction.User = &discord.User{ID: 42, Username: "alex"}
	}

	d := &componentTestDiscordProvider{}
	logs := &recordingLogProvider{}
	c := NewContext(
		context.Background(),
		5*time.Second,
		&selectTestContextData{interaction: interaction},
		FlowProviders{Discord: d, Log: logs},
		FlowContextLimits{MaxStackDepth: 20, MaxOperations: 1000, MaxCredits: 1000},
		eval.NewContext(eval.Env{}),
		state,
	)
	t.Cleanup(c.Cancel)
	return &selectTest{ctx: c, discord: d, logs: logs}
}

func logNode(id, msg string) *CompiledFlowNode {
	return &CompiledFlowNode{
		ID:   id,
		Type: FlowNodeTypeActionLog,
		Data: FlowNodeData{LogLevel: provider.LogLevelInfo, LogMessage: msg},
	}
}

func productSelect() *message.ComponentData {
	max := 2
	return &message.ComponentData{
		ID:        3,
		Type:      message.ComponentTypeStringSelect,
		MaxValues: &max,
		Options: []message.ComponentSelectOptionData{
			{ID: 1, Label: "VPS", Value: "vps"},
			{ID: 2, Label: "Hosting", Value: "hosting"},
			{ID: 3, Label: "Support", Value: "support"},
		},
	}
}

func infoLogs(entries []string) []string {
	var res []string
	for _, e := range entries {
		if strings.HasPrefix(e, "info:") {
			res = append(res, strings.TrimPrefix(e, "info:"))
		}
	}
	return res
}

func TestSelectEntryRunsOptionBranches(t *testing.T) {
	entry := &CompiledFlowNode{
		ID:   "entry",
		Type: FlowNodeTypeEntryComponentSelect,
		Children: ConnectedFlowNodes{
			Default: []*CompiledFlowNode{logNode("any", "any:{{select.labels}}")},
			Handles: map[string][]*CompiledFlowNode{
				"option_1":            {logNode("vps", "vps:{{option.label}}:{{option.index}}")},
				"option_2":            {logNode("hosting", "hosting:{{option.value}}")},
				"option_3":            {logNode("support", "support")},
				"option_3_unselected": {logNode("not-support", "not support:{{option.label}}")},
			},
		},
	}

	// Values arrive in the user's order; branches run in the configured order.
	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{
		CustomID: "flow", Values: []string{"hosting", "vps"},
	}}, nil)
	st.ctx.BindComponent(productSelect())

	require.NoError(t, entry.Execute(st.ctx))
	assert.Equal(t, []string{
		"any:[Hosting VPS]",
		"vps:VPS:0",
		"hosting:hosting",
		"not support:Support",
	}, infoLogs(st.logs.entries))

	_, bound := st.ctx.EvalCtx.Env["option"]
	assert.False(t, bound, "{{option}} is only bound inside an option's branch")
}

func TestSelectEntryIgnoresExtraValues(t *testing.T) {
	entry := &CompiledFlowNode{
		ID:   "entry",
		Type: FlowNodeTypeEntryComponentSelect,
		Children: ConnectedFlowNodes{Handles: map[string][]*CompiledFlowNode{
			"option_1": {logNode("vps", "vps")},
			"option_2": {logNode("hosting", "hosting")},
			"option_3": {logNode("support", "support")},
		}},
	}

	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{
		CustomID: "flow", Values: []string{"vps", "hosting", "support", "gone"},
	}}, nil)
	st.ctx.BindComponent(productSelect())

	require.NoError(t, entry.Execute(st.ctx))
	assert.Equal(t, []string{"vps", "hosting"}, infoLogs(st.logs.entries), "max_values is 2")
	assert.True(t, containsPrefix(st.logs.entries, "warn:Select menu received 4 values"))
}

func containsPrefix(entries []string, prefix string) bool {
	for _, e := range entries {
		if strings.HasPrefix(e, prefix) {
			return true
		}
	}
	return false
}

func TestInlineSelectResumesOptionBranches(t *testing.T) {
	sel := productSelect()
	msgNode := &CompiledFlowNode{
		ID:   "msg",
		Type: FlowNodeTypeActionResponseCreate,
		Data: FlowNodeData{MessageData: &message.MessageData{Components: []message.ComponentData{
			{Type: message.ComponentTypeActionRow, Components: []message.ComponentData{*sel}},
		}}},
		Children: ConnectedFlowNodes{Handles: map[string][]*CompiledFlowNode{
			"component_3":                     {logNode("any", "any")},
			"component_3_option_2":            {logNode("hosting", "hosting:{{option.label}}")},
			"component_3_option_1_unselected": {logNode("no-vps", "no vps")},
			"component_99_option_2":           {logNode("other", "other component")},
		}},
	}

	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{
		CustomID: discord.ComponentID(message.CustomIDMessageComponentResumePoint("rp", 3)),
		Values:   []string{"hosting"},
	}}, nil)

	require.NoError(t, msgNode.Execute(st.ctx))
	assert.Equal(t, []string{"any", "no vps", "hosting:Hosting"}, infoLogs(st.logs.entries))
	require.NotNil(t, st.ctx.Component)
	assert.Equal(t, 3, st.ctx.Component.ID)
}

func TestInlineComponentRemovedIsUnavailable(t *testing.T) {
	msgNode := &CompiledFlowNode{
		ID:   "msg",
		Type: FlowNodeTypeActionResponseCreate,
		Data: FlowNodeData{MessageData: &message.MessageData{}},
	}

	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{
		CustomID: discord.ComponentID(message.CustomIDMessageComponentResumePoint("rp", 3)),
	}}, nil)

	require.NoError(t, msgNode.Execute(st.ctx))
	require.Len(t, st.discord.created, 1)
	assert.Equal(t, "Thành phần này không còn khả dụng.", st.discord.created[0].Data.Content.Val)
	assert.Equal(t, discord.EphemeralMessage, st.discord.created[0].Data.Flags)
}

func TestComponentAccess(t *testing.T) {
	entryWith := func(access *message.ComponentAccessData) (*CompiledFlowNode, *message.ComponentData) {
		comp := &message.ComponentData{ID: 1, Type: message.ComponentTypeButton, Access: access}
		return &CompiledFlowNode{
			ID:       "entry",
			Type:     FlowNodeTypeEntryComponentButton,
			Children: ConnectedFlowNodes{Default: []*CompiledFlowNode{logNode("ran", "ran")}},
		}, comp
	}

	member := func(roles []discord.RoleID, perms discord.Permissions) *discord.Member {
		return &discord.Member{User: discord.User{ID: 42}, RoleIDs: roles, Permissions: perms}
	}

	tests := []struct {
		name    string
		access  *message.ComponentAccessData
		member  *discord.Member
		state   *FlowContextState
		allowed bool
	}{
		{"no rule", nil, member(nil, 0), nil, true},
		{"has role", &message.ComponentAccessData{Mode: message.ComponentAccessModeRoles, RoleIDs: []string{"7"}}, member([]discord.RoleID{7}, 0), nil, true},
		{"missing role", &message.ComponentAccessData{Mode: message.ComponentAccessModeRoles, RoleIDs: []string{"7"}}, member([]discord.RoleID{8}, 0), nil, false},
		{"has permission", &message.ComponentAccessData{Mode: message.ComponentAccessModePermissions, Permissions: "8192"}, member(nil, discord.PermissionManageMessages), nil, true},
		{"administrator", &message.ComponentAccessData{Mode: message.ComponentAccessModePermissions, Permissions: "8192"}, member(nil, discord.PermissionAdministrator), nil, true},
		{"missing permission", &message.ComponentAccessData{Mode: message.ComponentAccessModePermissions, Permissions: "8192"}, member(nil, discord.PermissionSendMessages), nil, false},
		{"invoker", &message.ComponentAccessData{Mode: message.ComponentAccessModeInvoker}, member(nil, 0), &FlowContextState{InvokerUserID: "42", NodeStates: map[string]*FlowContextNodeState{}, Temporaries: map[string]thing.Thing{}}, true},
		{"not invoker", &message.ComponentAccessData{Mode: message.ComponentAccessModeInvoker, DenyMessage: "Chỉ {{user.id}}"}, member(nil, 0), &FlowContextState{InvokerUserID: "1", NodeStates: map[string]*FlowContextNodeState{}, Temporaries: map[string]thing.Thing{}}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entry, comp := entryWith(tt.access)
			st := newSelectTest(t, &discord.InteractionEvent{
				Data:    &discord.ButtonInteraction{CustomID: "b"},
				Member:  tt.member,
				GuildID: 1,
			}, tt.state)
			st.ctx.BindComponent(comp)

			require.NoError(t, entry.Execute(st.ctx))
			if tt.allowed {
				assert.Equal(t, []string{"ran"}, infoLogs(st.logs.entries))
				return
			}

			assert.Empty(t, infoLogs(st.logs.entries))
			require.Len(t, st.discord.created, 1)
			assert.Equal(t, discord.EphemeralMessage, st.discord.created[0].Data.Flags)
			if tt.access.DenyMessage == "" {
				assert.Equal(t, defaultComponentDenyMessage, st.discord.created[0].Data.Content.Val)
			}
		})
	}
}

func TestInvokerIsRecordedForNewFlows(t *testing.T) {
	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.CommandInteraction{}}, nil)
	assert.Equal(t, "42", st.ctx.InvokerUserID)

	copied := st.ctx.FlowContextState.Copy()
	assert.Equal(t, "42", copied.InvokerUserID, "the invoker survives suspending")
}

func TestGenerateSelectOptions(t *testing.T) {
	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.CommandInteraction{}}, nil)
	st.ctx.SetTemporary("products", thing.FromAny([]any{
		map[string]any{"id": "a", "name": "Alpha"},
		map[string]any{"id": "b", "name": "Beta"},
		map[string]any{"id": "a", "name": "Duplicate"},
		map[string]any{"id": "", "name": "No value"},
	}))

	data := message.MessageData{Components: []message.ComponentData{{
		Type: message.ComponentTypeActionRow,
		Components: []message.ComponentData{{
			Type: message.ComponentTypeStringSelect,
			OptionsSource: &message.ComponentOptionsSourceData{
				Items:       "{{var('products')}}",
				Label:       "{{item.name}}",
				Value:       "{{item.id}}",
				Description: "#{{index}}",
			},
		}},
	}}}

	require.NoError(t, expandOptionSources(st.ctx, &data))
	sel := data.Components[0].Components[0]
	assert.Nil(t, sel.OptionsSource)
	require.Len(t, sel.Options, 2)
	assert.Equal(t, "Alpha", sel.Options[0].Label)
	assert.Equal(t, "b", sel.Options[1].Value)
	assert.Equal(t, "#1", sel.Options[1].Description)
	require.NoError(t, data.ValidateComponents(), "generated options are valid")

	_, bound := st.ctx.EvalCtx.Env["item"]
	assert.False(t, bound, "{{item}} is restored after generating options")

	st.ctx.SetTemporary("products", thing.FromAny([]any{}))
	data.Components[0].Components[0].Options = nil
	data.Components[0].Components[0].OptionsSource = &message.ComponentOptionsSourceData{Items: "{{var('products')}}", Label: "{{item}}", Value: "{{item}}"}
	assert.Error(t, expandOptionSources(st.ctx, &data), "an empty list can't produce a valid select")
}

func TestLoopForEach(t *testing.T) {
	each := &CompiledFlowNode{ID: "each", Type: FlowNodeTypeControlLoopEach}
	end := &CompiledFlowNode{ID: "end", Type: FlowNodeTypeControlLoopEnd}
	loop := &CompiledFlowNode{
		ID:       "loop",
		Type:     FlowNodeTypeControlLoop,
		Data:     FlowNodeData{LoopItems: "{{select.values}}"},
		Children: ConnectedFlowNodes{Default: []*CompiledFlowNode{each, end}},
	}
	each.Parents.Default = []*CompiledFlowNode{loop}
	end.Parents.Default = []*CompiledFlowNode{loop}
	each.Children.Default = []*CompiledFlowNode{logNode("item", "{{index}}={{item}}")}
	end.Children.Default = []*CompiledFlowNode{logNode("end", "done")}

	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{
		CustomID: "s", Values: []string{"a", "b", "c"},
	}}, nil)
	st.ctx.BindComponent(&message.ComponentData{Type: message.ComponentTypeStringSelect})

	require.NoError(t, loop.Execute(st.ctx))
	assert.Equal(t, []string{"0=a", "1=b", "2=c", "done"}, infoLogs(st.logs.entries))
}

func TestResetSelectOnAcknowledge(t *testing.T) {
	components := discord.TopLevelComponents{&discord.ActionRowComponent{&discord.StringSelectComponent{CustomID: "s"}}}

	t.Run("not responded: update the message", func(t *testing.T) {
		st := newSelectTest(t, &discord.InteractionEvent{
			Data:    &discord.StringSelectInteraction{CustomID: "s", Values: []string{"a"}},
			Message: &discord.Message{ID: 1, ChannelID: 2, Components: components},
		}, nil)
		st.ctx.BindComponent(&message.ComponentData{Type: message.ComponentTypeStringSelect, ResetOnSelect: true})

		require.NoError(t, AcknowledgeComponentInteraction(context.Background(), st.ctx))
		require.Len(t, st.discord.created, 1)
		assert.Equal(t, api.UpdateMessage, st.discord.created[0].Type)
		require.NotNil(t, st.discord.created[0].Data.Components)
		assert.Len(t, *st.discord.created[0].Data.Components, 1)
	})

	t.Run("flow edited the message itself", func(t *testing.T) {
		st := newSelectTest(t, &discord.InteractionEvent{
			Data:    &discord.StringSelectInteraction{CustomID: "s"},
			Message: &discord.Message{ID: 1, ChannelID: 2, Components: components},
		}, nil)
		st.ctx.BindComponent(&message.ComponentData{Type: message.ComponentTypeStringSelect, ResetOnSelect: true})
		st.ctx.componentMessageEdited = true

		require.NoError(t, AcknowledgeComponentInteraction(context.Background(), st.ctx))
		require.Len(t, st.discord.created, 1)
		assert.Equal(t, api.DeferredMessageUpdate, st.discord.created[0].Type)
	})
}

func TestDeferUpdateNode(t *testing.T) {
	node := &CompiledFlowNode{
		ID:   "defer",
		Type: FlowNodeTypeActionResponseDefer,
		Data: FlowNodeData{MessageDeferUpdate: true, MessageEphemeral: true},
	}

	st := newSelectTest(t, &discord.InteractionEvent{Data: &discord.StringSelectInteraction{CustomID: "s"}}, nil)
	// Not the entry: run it below a dummy parent depth.
	st.ctx.increaseStackDepth()
	require.NoError(t, node.Execute(st.ctx))
	require.Len(t, st.discord.created, 1)
	assert.Equal(t, api.DeferredMessageUpdate, st.discord.created[0].Type)
}
