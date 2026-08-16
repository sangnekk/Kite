package engine

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/diamondburned/arikawa/v3/state"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/eval"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"gopkg.in/guregu/null.v4"
)

const maxInternalEventDepth = 8

type InternalEvent struct {
	ID            string
	Name          string
	Payload       map[string]any
	Timestamp     time.Time
	CorrelationID string
	Depth         int
}

type InternalEventDispatcher interface {
	DispatchInternalEvent(ctx context.Context, appID, customEventID string, event InternalEvent, mode provider.InternalEventExecutionMode) (int, error)
}

type InternalEventProvider struct {
	appID      string
	store      store.CustomEventStore
	dispatcher InternalEventDispatcher
}

func NewInternalEventProvider(appID string, eventStore store.CustomEventStore, dispatcher InternalEventDispatcher) *InternalEventProvider {
	return &InternalEventProvider{appID: appID, store: eventStore, dispatcher: dispatcher}
}

func (p *InternalEventProvider) EmitInternalEvent(ctx context.Context, req provider.InternalEventEmitRequest) (provider.InternalEventEmitResult, error) {
	if req.Depth > maxInternalEventDepth {
		return provider.InternalEventEmitResult{}, fmt.Errorf("custom event chain exceeds maximum depth of %d", maxInternalEventDepth)
	}
	if p.store == nil || p.dispatcher == nil {
		return provider.InternalEventEmitResult{}, fmt.Errorf("custom event service is unavailable")
	}
	definition, err := p.store.CustomEvent(ctx, req.CustomEventID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return provider.InternalEventEmitResult{}, fmt.Errorf("custom event no longer exists")
		}
		return provider.InternalEventEmitResult{}, fmt.Errorf("failed to resolve custom event: %w", err)
	}
	if definition.AppID != p.appID {
		return provider.InternalEventEmitResult{}, fmt.Errorf("custom event belongs to another app")
	}

	eventID := util.UniqueID()
	correlationID := req.CorrelationID
	if correlationID == "" {
		correlationID = eventID
	}
	event := InternalEvent{
		ID: eventID, Name: definition.Name, Payload: req.Payload, Timestamp: time.Now().UTC(),
		CorrelationID: correlationID, Depth: req.Depth,
	}
	count, err := p.dispatcher.DispatchInternalEvent(ctx, p.appID, definition.ID, event, req.Mode)
	return provider.InternalEventEmitResult{EventID: eventID, EventName: definition.Name, SubscriberCount: count}, err
}

func (e *Engine) DispatchInternalEvent(ctx context.Context, appID, customEventID string, event InternalEvent, mode provider.InternalEventExecutionMode) (int, error) {
	e.RLock()
	app := e.apps[appID]
	e.RUnlock()
	if app == nil {
		return 0, nil
	}
	listeners := app.internalEventListeners(customEventID)
	if mode == provider.InternalEventExecutionModeAsync {
		for _, listener := range listeners {
			listener := listener
			go listener.env.executeInternalEvent(context.WithoutCancel(ctx), appID, listener.flow, event,
				entityLinks{EventListenerID: null.StringFrom(listener.listener.ID)})
		}
		return len(listeners), nil
	}

	var errs []error
	for _, listener := range listeners {
		if err := listener.env.executeInternalEvent(ctx, appID, listener.flow, event,
			entityLinks{EventListenerID: null.StringFrom(listener.listener.ID)}); err != nil {
			errs = append(errs, err)
		}
	}
	return len(listeners), errors.Join(errs...)
}

func (a *App) internalEventListeners(customEventID string) []*EventListener {
	a.RLock()
	defer a.RUnlock()
	listeners := make([]*EventListener, 0)
	for _, listener := range a.listeners {
		if listener.listener.Source == model.EventSourceInternal &&
			listener.listener.CustomEventID.Valid &&
			listener.listener.CustomEventID.String == customEventID {
			listeners = append(listeners, listener)
		}
	}
	return listeners
}

func (s Env) executeInternalEvent(ctx context.Context, appID string, node *flow.CompiledFlowNode, event InternalEvent, links entityLinks) (resultErr error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			resultErr = fmt.Errorf("custom event subscriber panicked: %v", recovered)
			s.createLogEntry(appID, model.LogLevelError, resultErr.Error(), links)
		}
	}()

	var session *state.State
	if s.SessionLookup != nil {
		session = s.SessionLookup.SessionForApp(appID)
	}
	providers := s.flowProviders(appID, session, links)
	data := &InternalEventData{
		name: event.Name, payload: event.Payload, timestamp: event.Timestamp,
		correlationID: event.CorrelationID, depth: event.Depth,
	}
	fCtx := flow.NewContext(ctx, 30*time.Second, data, providers, flow.FlowContextLimits{
		MaxStackDepth: s.Config.MaxStackDepth, MaxOperations: s.Config.MaxOperations, MaxCredits: s.Config.MaxCredits,
	}, eval.NewContextFromInternalEvent(event.Name, event.Payload, event.Timestamp, session), nil)
	defer fCtx.Cancel()

	shouldExecute, err := node.FilterEvent(fCtx)
	if err != nil {
		err = fmt.Errorf("failed to filter custom event %s (%s): %w", event.Name, event.ID, err)
		s.createLogEntry(appID, model.LogLevelError, err.Error(), links)
		return err
	}
	if !shouldExecute {
		return nil
	}
	if err := node.Execute(fCtx); err != nil {
		err = fmt.Errorf("failed to execute custom event %s (%s): %w", event.Name, event.ID, err)
		s.createLogEntry(appID, model.LogLevelError, err.Error(), links)
		resultErr = err
	}
	s.createUsageRecord(appID, model.UsageRecordTypeEventListenerFlowExecution, fCtx.CreditsUsed(), links)
	return resultErr
}
