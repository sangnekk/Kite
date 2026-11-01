package admin

import (
	"errors"
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/core/fulfillment"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

// ---------------------------------------------------------------- subscriptions

type SubscriptionItem struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	UserEmail   *string    `json:"user_email"`
	DisplayName string     `json:"display_name"`
	Source      string     `json:"source"`
	Status      string     `json:"status"`
	RenewsAt    *time.Time `json:"renews_at"`
	TrialEndsAt *time.Time `json:"trial_ends_at"`
	EndsAt      *time.Time `json:"ends_at"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (h *Handler) HandleSubscriptionList(c *handler.Context) (*ListResponse[SubscriptionItem], error) {
	query, err := search(c, 100)
	if err != nil {
		return nil, err
	}
	page, err := pageFrom(c, 20, 100)
	if err != nil {
		return nil, err
	}

	subs, total, err := h.console.AdminListSubscriptions(c.Context(), query, c.Query("status"), page)
	if err != nil {
		return nil, err
	}

	items := make([]SubscriptionItem, len(subs))
	for i, s := range subs {
		items[i] = SubscriptionItem{
			ID: s.ID, UserID: s.UserID, UserEmail: s.UserEmail, DisplayName: s.DisplayName, Source: s.Source,
			Status: s.Status, RenewsAt: s.RenewsAt, TrialEndsAt: s.TrialEndsAt, EndsAt: s.EndsAt, CreatedAt: s.CreatedAt,
		}
	}
	return listResponse(items, total, page), nil
}

// HandleSubscriptionCancel cancels a subscription and ends the entitlements it
// granted, so the apps really lose the plan.
func (h *Handler) HandleSubscriptionCancel(c *handler.Context) (*Empty, error) {
	id := c.Param("subscriptionID")
	if err := h.console.AdminSetSubscriptionStatus(c.Context(), id, "cancelled", now()); err != nil {
		return nil, storeError(err, "Subscription")
	}

	h.audit(c, "subscription.cancel", id, nil)
	return &Empty{}, nil
}

// ---------------------------------------------------------------- entitlements

type EntitlementItem struct {
	ID             string     `json:"id"`
	Type           string     `json:"type"`
	AppID          string     `json:"app_id"`
	AppName        *string    `json:"app_name"`
	SubscriptionID *string    `json:"subscription_id"`
	PlanID         string     `json:"plan_id"`
	EndsAt         *time.Time `json:"ends_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (h *Handler) HandleEntitlementList(c *handler.Context) (*ListResponse[EntitlementItem], error) {
	page, err := pageFrom(c, 20, 100)
	if err != nil {
		return nil, err
	}

	ents, total, err := h.console.AdminListEntitlements(c.Context(), page)
	if err != nil {
		return nil, err
	}

	items := make([]EntitlementItem, len(ents))
	for i, e := range ents {
		items[i] = EntitlementItem(e)
	}
	return listResponse(items, total, page), nil
}

type EntitlementGrantRequest struct {
	AppID  string `json:"app_id"`
	PlanID string `json:"plan_id"`
	// DurationDays of 0 (or omitted) grants the plan permanently.
	DurationDays int `json:"duration_days"`
}

const maxGrantDurationDays = 36500

func (h *Handler) HandleEntitlementGrant(c *handler.Context, req EntitlementGrantRequest) (*EntitlementItem, error) {
	if req.AppID == "" || req.PlanID == "" {
		return nil, handler.ErrBadRequest("invalid_request", "app_id and plan_id are required")
	}
	if req.DurationDays < 0 || req.DurationDays > maxGrantDurationDays {
		return nil, handler.ErrBadRequest("invalid_duration", fmt.Sprintf("duration_days must be between 0 and %d", maxGrantDurationDays))
	}
	if h.planManager.PlanByID(req.PlanID) == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	app, err := h.console.AdminApp(c.Context(), req.AppID)
	if err != nil {
		return nil, storeError(err, "App")
	}

	granted := now()
	var endsAt *time.Time
	if req.DurationDays > 0 {
		t := granted.AddDate(0, 0, req.DurationDays)
		endsAt = &t
	}

	id := util.UniqueID()
	if err := h.console.AdminCreateManualEntitlement(c.Context(), id, app.ID, req.PlanID, granted, endsAt); err != nil {
		return nil, err
	}

	h.audit(c, "entitlement.grant", id, map[string]any{
		"app_id": app.ID, "plan_id": req.PlanID, "duration_days": req.DurationDays,
	})

	name := app.Name
	return &EntitlementItem{
		ID: id, Type: "manual", AppID: app.ID, AppName: &name, PlanID: req.PlanID, EndsAt: endsAt, CreatedAt: granted,
	}, nil
}

func (h *Handler) HandleEntitlementDelete(c *handler.Context) (*Empty, error) {
	id := c.Param("entitlementID")
	if err := h.console.AdminDeleteEntitlement(c.Context(), id); err != nil {
		return nil, storeError(err, "Entitlement")
	}

	h.audit(c, "entitlement.delete", id, nil)
	return &Empty{}, nil
}

// ---------------------------------------------------------------- payment sessions

type PaymentSessionItem struct {
	ID        string     `json:"id"`
	PaymentID string     `json:"payment_id"`
	AppID     string     `json:"app_id"`
	AppName   *string    `json:"app_name"`
	PlanID    string     `json:"plan_id"`
	Provider  string     `json:"provider"`
	Amount    int        `json:"amount"`
	Status    string     `json:"status"`
	PaidAt    *time.Time `json:"paid_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (h *Handler) HandlePaymentSessionList(c *handler.Context) (*ListResponse[PaymentSessionItem], error) {
	page, err := pageFrom(c, 20, 100)
	if err != nil {
		return nil, err
	}

	sessions, total, err := h.console.AdminListPaymentSessions(c.Context(), c.Query("status"), page)
	if err != nil {
		return nil, err
	}

	items := make([]PaymentSessionItem, len(sessions))
	for i, s := range sessions {
		items[i] = PaymentSessionItem(s)
	}
	return listResponse(items, total, page), nil
}

type PaymentSessionUpdateRequest struct {
	// Status is "paid" (confirm the payment and grant the plan) or "failed"
	// (cancel a pending payment).
	Status string `json:"status"`
}

// HandlePaymentSessionUpdate lets an admin settle a pending payment by hand.
// Confirming grants the plan exactly like a bank notification would, so revenue
// and access can never disagree.
func (h *Handler) HandlePaymentSessionUpdate(c *handler.Context, req PaymentSessionUpdateRequest) (*Empty, error) {
	id := c.Param("sessionID")

	paymentID, err := h.console.AdminPaymentSessionPaymentID(c.Context(), id)
	if err != nil {
		return nil, storeError(err, "Payment session")
	}

	switch req.Status {
	case "paid":
		session, err := h.payments.PaymentSession(c.Context(), paymentID)
		if err != nil {
			return nil, fmt.Errorf("failed to load payment session: %w", err)
		}
		if session.Status != model.PaymentSessionStatusPending {
			return nil, handler.ErrBadRequest("payment_session_not_pending", fmt.Sprintf("payment session is %s", session.Status))
		}

		raw := fmt.Sprintf(`{"confirmed_by_admin":%q}`, c.AdminDiscordID)
		if err := h.fulfiller.Fulfill(c.Context(), session, "admin:"+c.AdminDiscordID, raw, now()); err != nil {
			var rejected *fulfillment.Error
			if errors.As(err, &rejected) {
				return nil, handler.ErrBadRequest(rejected.Code, rejected.Message)
			}
			return nil, err
		}

	case "failed":
		if err := h.console.AdminCancelPendingPaymentSession(c.Context(), id, string(model.PaymentSessionStatusFailed), now()); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return nil, handler.ErrBadRequest("payment_session_not_pending", "Only pending payment sessions can be cancelled")
			}
			return nil, err
		}

	default:
		return nil, handler.ErrBadRequest("invalid_status", `status must be "paid" or "failed"`)
	}

	h.audit(c, "payment_session.update", id, map[string]any{"payment_id": paymentID, "status": req.Status})
	return &Empty{}, nil
}
