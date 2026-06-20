package billing

import (
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

func (h *BillingHandler) HandleAppSubscriptionList(c *handler.Context) (*wire.SubscriptionListResponse, error) {
	subscriptions, err := h.subscriptionStore.SubscriptionsByAppID(c.Context(), c.App.ID)
	if err != nil {
		return nil, err
	}

	// Active entitlements are the source of truth for whether a plan is still
	// granted: they carry the real `ends_at` and drop out of this set once it
	// passes. A subscription row's own status/renews_at never change after
	// creation, so we derive each subscription's live status from its entitlement
	// here. Without this an expired plan keeps reporting "active", and the billing
	// UI never releases it (re-purchase stays blocked, the plan stays "current").
	entitlements, err := h.entitlementStore.ActiveEntitlements(c.Context(), c.App.ID, time.Now().UTC())
	if err != nil {
		return nil, err
	}

	activeSubscriptionIDs := make(map[string]bool, len(entitlements))
	for _, ent := range entitlements {
		if ent.SubscriptionID.Valid {
			activeSubscriptionIDs[ent.SubscriptionID.String] = true
		}
	}

	res := make(wire.SubscriptionListResponse, len(subscriptions))
	for i, subscription := range subscriptions {
		w := wire.SubscriptionToWire(subscription, c.Session.UserID)
		if !activeSubscriptionIDs[subscription.ID] {
			w.Status = "expired"
			w.StatusFormatted = "Hết hạn"
		}
		res[i] = w
	}

	// Manual grants from the admin console create an entitlement but no
	// subscription row, so they wouldn't show up otherwise. Surface active
	// manual entitlements (those not backed by a subscription) here too.
	for _, ent := range entitlements {
		if ent.Type != "manual" || ent.SubscriptionID.Valid {
			continue
		}
		res = append(res, h.manualEntitlementToWire(ent))
	}

	return &res, nil
}

// manualEntitlementToWire renders an admin-granted entitlement as a subscription
// entry so it appears in the bot's subscription list alongside paid ones.
func (h *BillingHandler) manualEntitlementToWire(ent *model.Entitlement) *wire.Subscription {
	displayName := ent.PlanID
	if plan := h.planManager.PlanByID(ent.PlanID); plan != nil {
		displayName = plan.Title
	}

	return &wire.Subscription{
		ID:              ent.ID,
		DisplayName:     displayName,
		PlanID:          ent.PlanID,
		Source:          string(model.SubscriptionSourceManual),
		Status:          "active",
		StatusFormatted: "Cấp thủ công",
		CreatedAt:       ent.CreatedAt,
		UpdatedAt:       ent.UpdatedAt,
		RenewsAt:        ent.CreatedAt.AddDate(50, 0, 0),
		EndsAt:          ent.EndsAt,
		Manageable:      false,
	}
}

func (h *BillingHandler) HandleSubscriptionManage(c *handler.Context) (*wire.SubscriptionManageResponse, error) {
	return nil, handler.ErrNotFound("unmanageable_subscription", "Subscription can not be managed")
}
