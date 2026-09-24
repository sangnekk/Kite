package engine

import (
	"context"
	"log/slog"

	"github.com/diamondburned/arikawa/v3/gateway"
	"github.com/diamondburned/arikawa/v3/state"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type MessageInstance struct {
	appID string
	msg   *model.MessageInstance
	flows map[string]*flow.CompiledFlowNode
	env   Env
}

func NewMessageInstance(
	appID string,
	msg *model.MessageInstance,
	env Env,
) (*MessageInstance, error) {
	flows := make(map[string]*flow.CompiledFlowNode, len(msg.FlowSources))

	for id, flowSource := range msg.FlowSources {
		flow, err := flow.CompileComponentButton(flowSource)
		if err != nil {
			slog.Error(
				"Failed to compile component button flow",
				slog.String("app_id", appID),
				slog.String("message_id", msg.MessageID),
				slog.String("error", err.Error()),
			)
			continue
		}

		flows[id] = flow
	}

	return &MessageInstance{
		appID: appID,
		msg:   msg,
		flows: flows,
		env:   env,
	}, nil
}

// Flow returns the compiled flow of the component with the given flow source ID,
// which is also the component's custom ID on Discord.
func (m *MessageInstance) Flow(flowSourceID string) (*flow.CompiledFlowNode, bool) {
	f, ok := m.flows[flowSourceID]
	return f, ok
}

func (m *MessageInstance) links(flowSourceID string) entityLinks {
	return entityLinks{
		MessageID:         null.NewString(m.msg.MessageID, true),
		MessageInstanceID: null.NewInt(int64(m.msg.ID), true),
		FlowSourceID:      null.NewString(flowSourceID, true),
	}
}

// HandleComponent executes the flow of the component (button or select menu)
// that was interacted with.
func (m *MessageInstance) HandleComponent(session *state.State, event gateway.Event, flowSourceID string, targetFlow *flow.CompiledFlowNode) {
	m.env.executeFlowEvent(
		context.Background(),
		m.appID,
		targetFlow,
		session,
		event,
		m.links(flowSourceID),
		nil,
	)
}
