package provider

import "context"

type InternalEventExecutionMode string

const (
	InternalEventExecutionModeAsync InternalEventExecutionMode = "async"
	InternalEventExecutionModeSync  InternalEventExecutionMode = "sync"
)

type InternalEventEmitRequest struct {
	CustomEventID string
	Payload       map[string]any
	Mode          InternalEventExecutionMode
	CorrelationID string
	Depth         int
}

type InternalEventEmitResult struct {
	EventID         string
	EventName       string
	SubscriberCount int
}

type InternalEventProvider interface {
	EmitInternalEvent(ctx context.Context, req InternalEventEmitRequest) (InternalEventEmitResult, error)
}
