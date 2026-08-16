package flow

import (
	"context"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type recordingInternalEventProvider struct {
	request provider.InternalEventEmitRequest
}

func (p *recordingInternalEventProvider) EmitInternalEvent(_ context.Context, req provider.InternalEventEmitRequest) (provider.InternalEventEmitResult, error) {
	p.request = req
	return provider.InternalEventEmitResult{
		EventID:         "emitted-event-id",
		EventName:       "shop.item_purchased",
		SubscriberCount: 2,
	}, nil
}

func TestFlowExecuteInternalEventEmitEvaluatesPayload(t *testing.T) {
	internalEvents := &recordingInternalEventProvider{}
	ctx := NewContext(
		context.Background(),
		5*time.Second,
		&TestContextData{},
		FlowProviders{InternalEvent: internalEvents},
		FlowContextLimits{MaxStackDepth: 10, MaxOperations: 10, MaxCredits: 10},
		eval.NewContext(eval.Env{
			"actor": map[string]any{"id": "42"},
		}),
		nil,
	)
	defer ctx.Cancel()

	node := &CompiledFlowNode{
		ID:   "emit",
		Type: FlowNodeTypeActionEventEmit,
		Data: FlowNodeData{
			CustomEventID:      "custom-event-id",
			EventExecutionMode: provider.InternalEventExecutionModeSync,
			EventPayload: map[string]any{
				"user_id": "{{actor.id}}",
				"amount":  "{{2 + 3}}",
				"nested":  []any{"fixed", "{{true}}"},
			},
		},
	}

	require.NoError(t, node.Execute(ctx))
	assert.Equal(t, "custom-event-id", internalEvents.request.CustomEventID)
	assert.Equal(t, provider.InternalEventExecutionModeSync, internalEvents.request.Mode)
	assert.Equal(t, 1, internalEvents.request.Depth)
	assert.Equal(t, "42", internalEvents.request.Payload["user_id"])
	assert.EqualValues(t, 5, internalEvents.request.Payload["amount"])
	assert.Equal(t, []any{"fixed", true}, internalEvents.request.Payload["nested"])
}

func TestCustomEventFilterUsesPayload(t *testing.T) {
	node := &CompiledFlowNode{
		Type: FlowNodeTypeEntryCustomEvent,
		Data: FlowNodeData{EventFilter: "event.payload.price >= 1000"},
	}

	newContext := func(price int) *FlowContext {
		return NewContext(
			context.Background(),
			5*time.Second,
			&TestContextData{},
			FlowProviders{},
			FlowContextLimits{},
			eval.NewContextFromInternalEvent(
				"shop.item_purchased",
				map[string]any{"price": price},
				time.Unix(0, 0),
				nil,
			),
			nil,
		)
	}

	accepted := newContext(1200)
	defer accepted.Cancel()
	result, err := node.FilterEvent(accepted)
	require.NoError(t, err)
	assert.True(t, result)

	rejected := newContext(500)
	defer rejected.Cancel()
	result, err = node.FilterEvent(rejected)
	require.NoError(t, err)
	assert.False(t, result)
}

func TestCustomEventFilterMustReturnBoolean(t *testing.T) {
	node := &CompiledFlowNode{
		Type: FlowNodeTypeEntryCustomEvent,
		Data: FlowNodeData{EventFilter: "event.payload.price"},
	}
	ctx := NewContext(
		context.Background(),
		5*time.Second,
		&TestContextData{},
		FlowProviders{},
		FlowContextLimits{},
		eval.NewContextFromInternalEvent("test.event", map[string]any{"price": 1000}, time.Unix(0, 0), nil),
		nil,
	)
	defer ctx.Cancel()

	_, err := node.FilterEvent(ctx)
	require.ErrorContains(t, err, "must return a boolean")
}
