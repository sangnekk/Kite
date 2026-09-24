package flow

import (
	"context"
	"testing"
	"time"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/discord"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/message"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type componentTestContextData struct {
	TestContextData
	interaction *discord.InteractionEvent
}

func (d *componentTestContextData) Interaction() *discord.InteractionEvent {
	return d.interaction
}

type deferCall struct {
	responseType api.InteractionResponseType
	flags        discord.MessageFlags
}

type componentTestDiscordProvider struct {
	TestDiscordProvider

	responded bool
	created   []api.InteractionResponse
	deferred  chan deferCall
}

func (p *componentTestDiscordProvider) HasCreatedInteractionResponse(ctx context.Context, interactionID discord.InteractionID) (bool, error) {
	return p.responded, nil
}

func (p *componentTestDiscordProvider) CreateInteractionResponse(ctx context.Context, interactionID discord.InteractionID, interactionToken string, response api.InteractionResponse) (*provider.InteractionResponseResource, error) {
	p.created = append(p.created, response)
	p.responded = true
	return nil, nil
}

func (p *componentTestDiscordProvider) AutoDeferInteraction(ctx context.Context, interactionID discord.InteractionID, interactionToken string, responseType api.InteractionResponseType, flags discord.MessageFlags) {
	if p.deferred != nil {
		p.deferred <- deferCall{responseType: responseType, flags: flags}
	}
}

func newComponentTestContext(t *testing.T, d *componentTestDiscordProvider, data discord.InteractionData) *FlowContext {
	t.Helper()

	c := NewContext(
		context.Background(),
		5*time.Second,
		&componentTestContextData{interaction: &discord.InteractionEvent{Data: data}},
		FlowProviders{
			Discord: d,
			Log:     &provider.MockLogProvider{},
		},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 1000, MaxCredits: 1000},
		eval.NewContext(eval.Env{}),
		nil,
	)
	t.Cleanup(c.Cancel)
	return c
}

func TestDeferredResponse(t *testing.T) {
	command := &discord.InteractionEvent{Data: &discord.CommandInteraction{}}
	button := &discord.InteractionEvent{Data: &discord.ButtonInteraction{}}
	stringSelect := &discord.InteractionEvent{Data: &discord.StringSelectInteraction{}}

	create := &CompiledFlowNode{Type: FlowNodeTypeActionResponseCreate}
	createEphemeral := &CompiledFlowNode{Type: FlowNodeTypeActionResponseCreate, Data: FlowNodeData{MessageEphemeral: true}}
	editOriginal := &CompiledFlowNode{Type: FlowNodeTypeActionResponseEdit}
	editFollowup := &CompiledFlowNode{Type: FlowNodeTypeActionResponseEdit, Data: FlowNodeData{MessageTarget: "{{result('1').id}}"}}

	tests := []struct {
		name         string
		interaction  *discord.InteractionEvent
		responseNode *CompiledFlowNode
		wantType     api.InteractionResponseType
		wantFlags    discord.MessageFlags
	}{
		{"command without response", command, nil, api.DeferredMessageInteractionWithSource, 0},
		{"command with edit", command, editOriginal, api.DeferredMessageInteractionWithSource, 0},
		{"command with ephemeral reply", command, createEphemeral, api.DeferredMessageInteractionWithSource, discord.EphemeralMessage},
		{"button without response", button, nil, api.DeferredMessageUpdate, 0},
		{"button editing its message", button, editOriginal, api.DeferredMessageUpdate, 0},
		{"button editing a followup", button, editFollowup, api.DeferredMessageInteractionWithSource, 0},
		{"button with reply", button, create, api.DeferredMessageInteractionWithSource, 0},
		{"select with ephemeral reply", stringSelect, createEphemeral, api.DeferredMessageInteractionWithSource, discord.EphemeralMessage},
		{"select without response", stringSelect, nil, api.DeferredMessageUpdate, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotType, gotFlags := deferredResponse(tt.interaction, tt.responseNode)
			assert.Equal(t, tt.wantType, gotType)
			assert.Equal(t, tt.wantFlags, gotFlags)
		})
	}
}

// A select menu on a message sent by a flow used to panic because the resume
// path asserted a button interaction.
func TestResumeFromComponentSelectMenu(t *testing.T) {
	reply := &CompiledFlowNode{
		ID:   "reply",
		Type: FlowNodeTypeActionResponseCreate,
		Data: FlowNodeData{
			MessageData:      &message.MessageData{Content: "Selected"},
			MessageEphemeral: true,
		},
	}
	msgNode := &CompiledFlowNode{
		ID:   "msg",
		Type: FlowNodeTypeActionResponseCreate,
		Children: ConnectedFlowNodes{
			Handles: map[string][]*CompiledFlowNode{"component_3": {reply}},
		},
	}

	d := &componentTestDiscordProvider{deferred: make(chan deferCall, 1)}
	c := newComponentTestContext(t, d, &discord.StringSelectInteraction{
		CustomID: discord.ComponentID(message.CustomIDMessageComponentResumePoint("rp", 3)),
		Values:   []string{"vps"},
	})

	require.NoError(t, msgNode.Execute(c))

	require.Len(t, d.created, 1)
	assert.Equal(t, api.MessageInteractionWithSource, d.created[0].Type)
	require.NotNil(t, d.created[0].Data)
	assert.Equal(t, "Selected", d.created[0].Data.Content.Val)

	// The defer is predicted from the component's branch, not from the nodes that
	// run after the message was sent.
	select {
	case call := <-d.deferred:
		assert.Equal(t, api.DeferredMessageInteractionWithSource, call.responseType)
		assert.Equal(t, discord.EphemeralMessage, call.flags)
	case <-time.After(time.Second):
		t.Fatal("interaction was not auto-deferred")
	}
}

func TestAcknowledgeComponentInteraction(t *testing.T) {
	t.Run("component without response is acknowledged", func(t *testing.T) {
		d := &componentTestDiscordProvider{}
		c := newComponentTestContext(t, d, &discord.ButtonInteraction{CustomID: "x"})

		require.NoError(t, AcknowledgeComponentInteraction(context.Background(), c))
		require.Len(t, d.created, 1)
		assert.Equal(t, api.DeferredMessageUpdate, d.created[0].Type)
	})

	t.Run("component with response is left alone", func(t *testing.T) {
		d := &componentTestDiscordProvider{responded: true}
		c := newComponentTestContext(t, d, &discord.StringSelectInteraction{CustomID: "x"})

		require.NoError(t, AcknowledgeComponentInteraction(context.Background(), c))
		assert.Empty(t, d.created)
	})

	t.Run("commands are left alone", func(t *testing.T) {
		d := &componentTestDiscordProvider{}
		c := newComponentTestContext(t, d, &discord.CommandInteraction{})

		require.NoError(t, AcknowledgeComponentInteraction(context.Background(), c))
		assert.Empty(t, d.created)
	})
}
