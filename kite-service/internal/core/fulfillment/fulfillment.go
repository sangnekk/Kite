// Package fulfillment turns a confirmed payment into the subscription and
// entitlement that give an app its plan. It is shared by the SePay IPN webhook
// and by the admin console (manually confirming a payment), so both grant
// access in exactly the same way.
package fulfillment

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"gopkg.in/guregu/null.v4"
)

// Error is a business-rule rejection (as opposed to an infrastructure failure):
// retrying the same payment will never succeed.
type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Message }

type Fulfiller struct {
	appStore            store.AppStore
	subscriptionStore   store.SubscriptionStore
	entitlementStore    store.EntitlementStore
	paymentSessionStore store.PaymentSessionStore
	planManager         *plan.PlanManager
}

func New(
	appStore store.AppStore,
	subscriptionStore store.SubscriptionStore,
	entitlementStore store.EntitlementStore,
	paymentSessionStore store.PaymentSessionStore,
	planManager *plan.PlanManager,
) *Fulfiller {
	return &Fulfiller{
		appStore:            appStore,
		subscriptionStore:   subscriptionStore,
		entitlementStore:    entitlementStore,
		paymentSessionStore: paymentSessionStore,
		planManager:         planManager,
	}
}

// Fulfill grants the plan of a pending payment session to its app and marks the
// session as paid. orderRef identifies the confirmation (bank reference, or the
// admin who confirmed it manually) and rawPayload is stored for reconciliation.
func (f *Fulfiller) Fulfill(ctx context.Context, session *model.PaymentSession, orderRef string, rawPayload string, now time.Time) error {
	plan := f.planManager.PlanByID(session.PlanID)
	if plan == nil {
		return &Error{Code: "unknown_plan", Message: "Unknown plan"}
	}

	app, err := f.appStore.App(ctx, session.AppID)
	if err != nil {
		return fmt.Errorf("failed to load app: %w", err)
	}

	// Reject a payment when the app already has any active plan (paid or manually
	// granted). Checkout creation guards this too, so reaching here is an anomaly
	// (e.g. a plan granted after checkout started) that needs manual handling
	// (refund) rather than stacking a parallel entitlement.
	activeEntitlements, err := f.entitlementStore.ActiveEntitlements(ctx, app.ID, now)
	if err != nil {
		return fmt.Errorf("failed to load active entitlements: %w", err)
	}
	if len(activeEntitlements) > 0 {
		return &Error{
			Code:    "plan_already_active",
			Message: fmt.Sprintf("app already has an active entitlement (plan %s)", activeEntitlements[0].PlanID),
		}
	}

	// A plan with a positive premium duration grants access for a fixed window:
	// the entitlement (the source of truth for feature gating) expires at endsAt
	// and the subscription record mirrors it, so the billing UI releases the plan
	// once it lapses instead of showing it as active forever. A zero duration
	// means lifetime access (no expiry), kept as a far-future RenewsAt.
	endsAt := null.Time{}
	renewsAt := now.AddDate(50, 0, 0)
	if plan.PremiumDurationDays > 0 {
		end := now.AddDate(0, 0, plan.PremiumDurationDays)
		endsAt = null.TimeFrom(end)
		renewsAt = end
	}

	subscription, err := f.subscriptionStore.UpsertSubscription(ctx, model.Subscription{
		ID:                         util.UniqueID(),
		DisplayName:                plan.Title,
		Source:                     model.SubscriptionSourceSePay,
		Status:                     "active",
		StatusFormatted:            "Active",
		RenewsAt:                   renewsAt,
		TrialEndsAt:                null.Time{},
		EndsAt:                     endsAt,
		CreatedAt:                  now,
		UpdatedAt:                  now,
		UserID:                     app.OwnerUserID,
		PaymentID:                  null.StringFrom(session.PaymentID),
		PaymentReference:           null.StringFrom(orderRef),
		PlanID:                     null.StringFrom(plan.ID),
	})
	if err != nil {
		slog.Error(
			"Failed to upsert sepay subscription",
			slog.String("payment_id", session.PaymentID),
			slog.String("error", err.Error()),
		)
		return fmt.Errorf("failed to upsert subscription: %w", err)
	}

	_, err = f.entitlementStore.UpsertSubscriptionEntitlement(ctx, model.Entitlement{
		ID:             util.UniqueID(),
		Type:           "subscription",
		SubscriptionID: null.StringFrom(subscription.ID),
		AppID:          app.ID,
		PlanID:         plan.ID,
		CreatedAt:      now,
		UpdatedAt:      now,
		EndsAt:         endsAt,
	})
	if err != nil {
		return fmt.Errorf("failed to upsert subscription entitlement: %w", err)
	}

	if _, err := f.paymentSessionStore.MarkPaymentSessionPaid(ctx, session.PaymentID, orderRef, rawPayload, now); err != nil {
		return fmt.Errorf("failed to mark payment session paid: %w", err)
	}
	return nil
}
