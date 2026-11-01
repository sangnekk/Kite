package admin

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/core/fulfillment"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type Handler struct {
	access      *Access
	console     store.AdminConsoleStore
	admins      store.AdminUserStore
	users       store.UserStore
	payments    store.PaymentSessionStore
	planStore   store.PlanStore
	planManager *plan.PlanManager
	settings    *settings.Manager
	fulfiller   *fulfillment.Fulfiller
}

type Deps struct {
	Access      *Access
	Console     store.AdminConsoleStore
	Admins      store.AdminUserStore
	Users       store.UserStore
	Payments    store.PaymentSessionStore
	PlanStore   store.PlanStore
	PlanManager *plan.PlanManager
	Settings    *settings.Manager
	Fulfiller   *fulfillment.Fulfiller
}

func NewHandler(d Deps) *Handler {
	return &Handler{
		access:      d.Access,
		console:     d.Console,
		admins:      d.Admins,
		users:       d.Users,
		payments:    d.Payments,
		planStore:   d.PlanStore,
		planManager: d.PlanManager,
		settings:    d.Settings,
		fulfiller:   d.Fulfiller,
	}
}

// Empty is the body of actions that only report success.
type Empty struct{}

type ListResponse[T any] struct {
	Items    []T `json:"items"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

func listResponse[T any](items []T, total int, page store.Page) *ListResponse[T] {
	if items == nil {
		items = []T{}
	}
	return &ListResponse[T]{Items: items, Total: total, Page: page.Number, PageSize: page.Size}
}

// pageFrom reads ?page and ?page_size with the given default and maximum size.
func pageFrom(c *handler.Context, defaultSize, maxSize int) (store.Page, error) {
	page := store.Page{Number: 1, Size: defaultSize}

	if raw := c.Query("page"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 {
			return page, handler.ErrBadRequest("invalid_page", "page must be a positive integer")
		}
		page.Number = n
	}
	if raw := c.Query("page_size"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > maxSize {
			return page, handler.ErrBadRequest("invalid_page_size", fmt.Sprintf("page_size must be between 1 and %d", maxSize))
		}
		page.Size = n
	}
	return page, nil
}

// search reads the free-text ?search parameter.
func search(c *handler.Context, maxLen int) (string, error) {
	s := c.Query("search")
	if len(s) > maxLen {
		return "", handler.ErrBadRequest("invalid_search", fmt.Sprintf("search must be at most %d characters", maxLen))
	}
	return s, nil
}

func parseBody[T any](c *handler.Context) (T, error) {
	var v T
	if err := c.ParseBody(&v); err != nil {
		return v, handler.ErrBadRequest("invalid_request", err.Error())
	}
	return v, nil
}

// storeError maps a store error to an API error.
func storeError(err error, what string) error {
	if errors.Is(err, store.ErrNotFound) {
		return handler.ErrNotFound("not_found", what+" not found")
	}
	return err
}

// audit records an admin action. A failing audit write is logged but never
// fails the request, the action itself has already happened.
func (h *Handler) audit(c *handler.Context, action string, target string, detail any) {
	var raw []byte
	if detail != nil {
		var err error
		if raw, err = json.Marshal(detail); err != nil {
			slog.Error("Failed to encode admin audit detail", slog.String("action", action), slog.String("error", err.Error()))
		}
	}

	if err := h.admins.AddAdminAudit(c.Context(), store.AdminAuditEntry{
		ActorDiscordID: c.AdminDiscordID,
		Action:         action,
		Target:         target,
		Detail:         raw,
	}); err != nil {
		slog.Error(
			"Failed to write admin audit log",
			slog.String("action", action),
			slog.String("target", target),
			slog.String("actor", c.AdminDiscordID),
			slog.String("error", err.Error()),
		)
	}
}

func now() time.Time { return time.Now().UTC() }
