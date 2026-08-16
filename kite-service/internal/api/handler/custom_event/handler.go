package customevent

import (
	"errors"
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

type Handler struct{ store store.CustomEventStore }

func NewHandler(store store.CustomEventStore) *Handler { return &Handler{store: store} }

func (h *Handler) List(c *handler.Context) (*wire.CustomEventListResponse, error) {
	events, err := h.store.CustomEventsByApp(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list custom events: %w", err)
	}
	res := make([]*wire.CustomEvent, len(events))
	for i, event := range events {
		res[i] = wire.CustomEventToWire(event)
	}
	return &res, nil
}

func (h *Handler) Get(c *handler.Context) (*wire.CustomEventGetResponse, error) {
	event, err := h.eventForApp(c)
	if err != nil {
		return nil, err
	}
	return wire.CustomEventToWire(event), nil
}

func (h *Handler) Create(c *handler.Context, req wire.CustomEventCreateRequest) (*wire.CustomEventCreateResponse, error) {
	now := time.Now().UTC()
	event, err := h.store.CreateCustomEvent(c.Context(), &model.CustomEvent{
		ID: util.UniqueID(), AppID: c.App.ID, Name: req.Name, Description: req.Description,
		CreatedAt: now, UpdatedAt: now,
	})
	if errors.Is(err, store.ErrAlreadyExists) {
		return nil, handler.ErrBadRequest("already_exists", fmt.Sprintf("Sự kiện %q đã tồn tại", req.Name))
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create custom event: %w", err)
	}
	return wire.CustomEventToWire(event), nil
}

func (h *Handler) Update(c *handler.Context, req wire.CustomEventUpdateRequest) (*wire.CustomEventUpdateResponse, error) {
	event, err := h.eventForApp(c)
	if err != nil {
		return nil, err
	}
	event.Name, event.Description, event.UpdatedAt = req.Name, req.Description, time.Now().UTC()
	event, err = h.store.UpdateCustomEvent(c.Context(), event)
	if errors.Is(err, store.ErrAlreadyExists) {
		return nil, handler.ErrBadRequest("already_exists", fmt.Sprintf("Sự kiện %q đã tồn tại", req.Name))
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update custom event: %w", err)
	}
	return wire.CustomEventToWire(event), nil
}

func (h *Handler) Delete(c *handler.Context) (*wire.CustomEventDeleteResponse, error) {
	event, err := h.eventForApp(c)
	if err != nil {
		return nil, err
	}
	err = h.store.DeleteCustomEvent(c.Context(), event.ID)
	if errors.Is(err, store.ErrAlreadyExists) {
		return nil, handler.ErrBadRequest("event_in_use", "Sự kiện vẫn đang được một flow lắng nghe")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to delete custom event: %w", err)
	}
	return &wire.CustomEventDeleteResponse{}, nil
}

func (h *Handler) eventForApp(c *handler.Context) (*model.CustomEvent, error) {
	event, err := h.store.CustomEvent(c.Context(), c.Param("customEventID"))
	if errors.Is(err, store.ErrNotFound) || (err == nil && event.AppID != c.App.ID) {
		return nil, handler.ErrNotFound("unknown_custom_event", "Custom event not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get custom event: %w", err)
	}
	return event, nil
}
