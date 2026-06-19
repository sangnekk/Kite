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

	res := make(wire.SubscriptionListResponse, len(subscriptions))
	for i, subscription := range subscriptions {
		res[i] = wire.SubscriptionToWire(subscription, c.Session.UserID)
	}

	// Manual grants from the admin console create an entitlement but no
	// subscription row, so they wouldn't show up otherwise. Surface active
	// manual entitlements (those not backed by a subscription) here too.
	entitlements, err := h.entitlementStore.ActiveEntitlements(c.Context(), c.App.ID, time.Now().UTC())
	if err != nil {
		return nil, err
	}
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
