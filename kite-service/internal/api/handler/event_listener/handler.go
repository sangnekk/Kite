package eventlistener

import (
	"errors"
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/flow"
	"gopkg.in/guregu/null.v4"
)

type EventListenerHandler struct {
	eventListenerStore store.EventListenerStore
	customEventStore   store.CustomEventStore
}

func NewEventListenerHandler(eventListenerStore store.EventListenerStore, customEventStore store.CustomEventStore) *EventListenerHandler {
	return &EventListenerHandler{
		eventListenerStore: eventListenerStore,
		customEventStore:   customEventStore,
	}
}

func (h *EventListenerHandler) HandleEventListenerList(c *handler.Context) (*wire.EventListenerListResponse, error) {
	eventListeners, err := h.eventListenerStore.EventListenersByApp(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get event listeners: %w", err)
	}

	res := make([]*wire.EventListener, len(eventListeners))
	for i, eventListener := range eventListeners {
		res[i] = wire.EventListenerToWire(eventListener)
	}

	return &res, nil
}

func (h *EventListenerHandler) HandleEventListenerGet(c *handler.Context) (*wire.EventListenerGetResponse, error) {
	return wire.EventListenerToWire(c.EventListener), nil
}

func (h *EventListenerHandler) HandleEventListenerCreate(c *handler.Context, req wire.EventListenerCreateRequest) (*wire.EventListenerCreateResponse, error) {
	if c.Features.MaxEventListeners != 0 {
		eventListenerCount, err := h.eventListenerStore.CountEventListenersByApp(c.Context(), c.App.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to count event listeners: %w", err)
		}

		if eventListenerCount >= c.Features.MaxEventListeners {
			return nil, handler.ErrBadRequest("resource_limit", fmt.Sprintf("maximum number of event listeners (%d) reached", c.Features.MaxEventListeners))
		}
	}

	eventFlow, customEvent, err := h.compileFlow(c, model.EventSource(req.Source), req.FlowSource)
	if err != nil {
		return nil, fmt.Errorf("failed to compile event listener: %w", err)
	}

	modelListener := &model.EventListener{
		ID:            util.UniqueID(),
		AppID:         c.App.ID,
		CreatorUserID: c.Session.UserID,
		Source:        model.EventSource(req.Source),
		Type:          model.EventListenerType(eventFlow.EventListenerType()),
		Description:   eventFlow.EventDescription(),
		// TODO: Filter:        eventFlow.EventListenerFilter(),
		FlowSource: req.FlowSource,
		Enabled:    req.Enabled,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	if customEvent != nil {
		modelListener.CustomEventID = null.StringFrom(customEvent.ID)
		modelListener.Type = model.EventListenerType(customEvent.Name)
	}
	eventListener, err := h.eventListenerStore.CreateEventListener(c.Context(), modelListener)
	if err != nil {
		return nil, fmt.Errorf("failed to create event listener: %w", err)
	}

	return wire.EventListenerToWire(eventListener), nil
}

func (h *EventListenerHandler) HandleEventListenersImport(c *handler.Context, req wire.EventListenersImportRequest) (*wire.EventListenersImportResponse, error) {
	if c.Features.MaxEventListeners != 0 {
		eventListenerCount, err := h.eventListenerStore.CountEventListenersByApp(c.Context(), c.App.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to count event listeners: %w", err)
		}

		newEventListenerCount := eventListenerCount + len(req.EventListeners)

		if newEventListenerCount > c.Features.MaxEventListeners {
			return nil, handler.ErrBadRequest("resource_limit", fmt.Sprintf("maximum number of event listeners (%d) reached", c.Features.MaxEventListeners))
		}
	}

	res := make([]*wire.EventListener, len(req.EventListeners))

	for i, listener := range req.EventListeners {
		eventFlow, customEvent, err := h.compileFlow(c, model.EventSource(listener.Source), listener.FlowSource)
		if err != nil {
			return nil, fmt.Errorf("failed to compile event listener: %w", err)
		}

		modelListener := &model.EventListener{
			ID:            util.UniqueID(),
			AppID:         c.App.ID,
			CreatorUserID: c.Session.UserID,
			Source:        model.EventSource(listener.Source),
			Type:          model.EventListenerType(eventFlow.EventListenerType()),
			Description:   eventFlow.EventDescription(),
			// TODO: Filter:        eventFlow.EventListenerFilter(),
			FlowSource: listener.FlowSource,
			Enabled:    listener.Enabled,
			CreatedAt:  time.Now().UTC(),
			UpdatedAt:  time.Now().UTC(),
		}
		if customEvent != nil {
			modelListener.CustomEventID = null.StringFrom(customEvent.ID)
			modelListener.Type = model.EventListenerType(customEvent.Name)
		}
		eventListener, err := h.eventListenerStore.CreateEventListener(c.Context(), modelListener)
		if err != nil {
			return nil, fmt.Errorf("failed to create event listener: %w", err)
		}

		res[i] = wire.EventListenerToWire(eventListener)
	}

	return &res, nil
}

func (h *EventListenerHandler) HandleEventListenerUpdate(c *handler.Context, req wire.EventListenerUpdateRequest) (*wire.EventListenerUpdateResponse, error) {
	eventFlow, customEvent, err := h.compileFlow(c, c.EventListener.Source, req.FlowSource)
	if err != nil {
		return nil, fmt.Errorf("failed to compile event listener: %w", err)
	}

	modelListener := &model.EventListener{
		ID:          c.EventListener.ID,
		Type:        model.EventListenerType(eventFlow.EventListenerType()),
		Description: eventFlow.EventDescription(),
		// TODO: Filter:      eventFlow.EventListenerFilter(),
		FlowSource:    req.FlowSource,
		Enabled:       req.Enabled,
		UpdatedAt:     time.Now().UTC(),
		CustomEventID: c.EventListener.CustomEventID,
	}
	if customEvent != nil {
		modelListener.CustomEventID = null.StringFrom(customEvent.ID)
		modelListener.Type = model.EventListenerType(customEvent.Name)
	}
	eventListener, err := h.eventListenerStore.UpdateEventListener(c.Context(), modelListener)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_event_listener", "Event listener not found")
		}
		return nil, fmt.Errorf("failed to update event listener: %w", err)
	}

	return wire.EventListenerToWire(eventListener), nil
}

func (h *EventListenerHandler) HandleEventListenerUpdateEnabled(c *handler.Context, req wire.EventListenerUpdateEnabledRequest) (*wire.EventListenerUpdateEnabledResponse, error) {
	eventListener, err := h.eventListenerStore.UpdateEventListener(c.Context(), &model.EventListener{
		ID:            c.EventListener.ID,
		Type:          c.EventListener.Type,
		Description:   c.EventListener.Description,
		FlowSource:    c.EventListener.FlowSource,
		CustomEventID: c.EventListener.CustomEventID,
		Enabled:       req.Enabled,
		UpdatedAt:     time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_event_listener", "Event listener not found")
		}
		return nil, fmt.Errorf("failed to update event listener: %w", err)
	}

	return wire.EventListenerToWire(eventListener), nil
}

func (h *EventListenerHandler) compileFlow(c *handler.Context, source model.EventSource, data flow.FlowData) (*flow.CompiledFlowNode, *model.CustomEvent, error) {
	if source != model.EventSourceInternal {
		compiled, err := flow.CompileEventListener(data)
		return compiled, nil, err
	}
	compiled, err := flow.CompileCustomEventListener(data)
	if err != nil {
		return nil, nil, err
	}
	event, err := h.customEventStore.CustomEvent(c.Context(), compiled.Data.CustomEventID)
	if errors.Is(err, store.ErrNotFound) || (err == nil && event.AppID != c.App.ID) {
		return nil, nil, handler.ErrBadRequest("unknown_custom_event", "Custom event not found in this app")
	}
	if err != nil {
		return nil, nil, fmt.Errorf("failed to resolve custom event: %w", err)
	}
	return compiled, event, nil
}

func (h *EventListenerHandler) HandleEventListenerDelete(c *handler.Context) (*wire.EventListenerDeleteResponse, error) {
	err := h.eventListenerStore.DeleteEventListener(c.Context(), c.EventListener.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_event_listener", "Event listener not found")
		}
		return nil, fmt.Errorf("failed to delete event listener: %w", err)
	}

	return &wire.EventListenerDeleteResponse{}, nil
}
