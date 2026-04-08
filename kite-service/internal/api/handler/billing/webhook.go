package billing

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/handler/billing/payment"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"gopkg.in/guregu/null.v4"
)

func (h *BillingHandler) HandleBillingWebhook(c *handler.Context, body json.RawMessage) (*wire.BillingWebhookResponse, error) {
	signature := c.Header("X-HMAC-Signature")

	if !payment.VerifyHMAC(body, signature, h.config.WebhookHMACSecret) {
		return nil, fmt.Errorf("failed to verify webhook signature")
	}

	var req wire.BillingPaymentWebhookRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, fmt.Errorf("failed to unmarshal webhook event: %w", err)
	}

	paymentID, ok := payment.ExtractInvoiceNumber(req.Description)
	if !ok {
		return nil, fmt.Errorf("failed to parse transfer code from description")
	}

	code, ok := payment.DecodeInvoiceNumber(paymentID)
	if !ok {
		return nil, fmt.Errorf("failed to parse transfer code from description")
	}

	amount, err := payment.ParseAmountVND(req.Amount)
	if err != nil {
		return nil, fmt.Errorf("failed to parse amount: %w", err)
	}

	plan := h.planManager.PlanByID(code.PlanID)
	if plan == nil {
		return nil, fmt.Errorf("failed to find plan: %s", code.PlanID)
	}

	expectedAmount := plan.PaymentAmount
	if expectedAmount <= 0 {
		expectedAmount = int(plan.Price)
	}

	if amount != expectedAmount {
		return nil, fmt.Errorf("amount mismatch: expected %d got %d", expectedAmount, amount)
	}

	app, err := h.appStore.App(c.Context(), code.AppID)
	if err != nil {
		return nil, fmt.Errorf("failed to load app from transfer code: %w", err)
	}

	now := time.Now().UTC()
	renewsAt := now.AddDate(50, 0, 0)

	subscription, err := h.subscriptionStore.UpsertLemonSqueezySubscription(c.Context(), model.Subscription{
		ID:                         util.UniqueID(),
		DisplayName:                plan.Title,
		Source:                     model.SubscriptionSourceManual,
		Status:                     "active",
		StatusFormatted:            "Active",
		RenewsAt:                   renewsAt,
		TrialEndsAt:                null.Time{},
		EndsAt:                     null.Time{},
		CreatedAt:                  now,
		UpdatedAt:                  now,
		UserID:                     app.OwnerUserID,
		LemonsqueezySubscriptionID: null.StringFrom(req.RefNo),
		LemonsqueezyCustomerID:     null.String{},
		LemonsqueezyOrderID:        null.StringFrom(req.RefNo),
		LemonsqueezyProductID:      null.StringFrom(plan.ID),
		LemonsqueezyVariantID:      null.StringFrom(code.Nonce),
	})
	if err != nil {
		slog.Error(
			"Failed to upsert subscription",
			slog.String("payment_ref_no", req.RefNo),
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("failed to upsert subscription: %w", err)
	}

	entitlementEndsAt := null.Time{}
	if plan.PremiumDurationDays > 0 {
		entitlementEndsAt = null.TimeFrom(now.AddDate(0, 0, plan.PremiumDurationDays))
	}

	entitlement := model.Entitlement{
		ID:             util.UniqueID(),
		Type:           "subscription",
		SubscriptionID: null.StringFrom(subscription.ID),
		AppID:          app.ID,
		PlanID:         plan.ID,
		CreatedAt:      now,
		UpdatedAt:      now,
		EndsAt:         entitlementEndsAt,
	}

	_, err = h.entitlementStore.UpsertSubscriptionEntitlement(c.Context(), entitlement)
	if err != nil {
		slog.Error(
			"Failed to upsert subscription entitlement",
			slog.String("subscription_id", subscription.ID),
			slog.String("payment_ref_no", req.RefNo),
			slog.String("error", err.Error()),
		)
		return nil, fmt.Errorf("failed to upsert subscription entitlement: %w", err)
	}

	return &wire.BillingWebhookResponse{}, nil
}
