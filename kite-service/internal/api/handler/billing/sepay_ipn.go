package billing

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/handler/billing/payment"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"gopkg.in/guregu/null.v4"
)

func (h *BillingHandler) HandleSePayIPN(c *handler.Context, body json.RawMessage) (*wire.BillingWebhookResponse, error) {
	secret := strings.TrimSpace(h.config.SePaySecretKey)
	authHeader := strings.TrimSpace(c.Header("Authorization"))
	secretHeader := strings.TrimSpace(c.Header("X-Secret-Key"))
	if secret == "" || (authHeader != "Apikey "+secret && authHeader != "APIKEY "+secret && secretHeader != secret) {
		return nil, handler.ErrUnauthorized("unauthorized", "invalid sepay secret key")
	}

	var req wire.BillingSePayIPNRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, handler.ErrBadRequest("invalid_request", fmt.Sprintf("failed to decode sepay ipn: %v", err))
	}

	if !strings.EqualFold(req.TransferType, "in") {
		return &wire.BillingWebhookResponse{}, nil
	}

	paymentRef := firstNonEmpty(derefString(req.Code), req.Content, req.Description, req.ReferenceCode)
	paymentID, ok := payment.ExtractInvoiceNumber(paymentRef)
	if !ok {
		return nil, handler.ErrBadRequest("invalid_invoice_number", "failed to parse invoice number")
	}
	code, ok := payment.DecodeInvoiceNumber(paymentID)
	if !ok {
		return nil, handler.ErrBadRequest("invalid_payment_code", "failed to parse payment code")
	}

	if h.paymentSessionStore == nil {
		return nil, fmt.Errorf("payment session store is not configured")
	}

	session, err := h.paymentSessionStore.PaymentSession(c.Context(), paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load payment session: %w", err)
	}

	if session.PlanID != code.PlanID {
		return nil, handler.ErrBadRequest("plan_mismatch", "payment session plan does not match payment code")
	}

	if session.AppID != code.AppID {
		return nil, handler.ErrBadRequest("app_mismatch", "payment session app does not match payment code")
	}

	amount := int(req.TransferAmount)
	if amount != session.Amount {
		return nil, handler.ErrBadRequest("amount_mismatch", fmt.Sprintf("expected %d got %d", session.Amount, amount))
	}

	if strings.TrimSpace(req.AccountNumber) != strings.TrimSpace(h.config.MerchantAccountNo) {
		return nil, handler.ErrBadRequest("account_mismatch", "payment account does not match configured account")
	}

	plan := h.planManager.PlanByID(code.PlanID)
	if plan == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	app, err := h.appStore.App(c.Context(), code.AppID)
	if err != nil {
		return nil, fmt.Errorf("failed to load app: %w", err)
	}

	now := time.Now().UTC()
	renewsAt := now.AddDate(50, 0, 0)
	subscription, err := h.subscriptionStore.UpsertLemonSqueezySubscription(c.Context(), model.Subscription{
		ID:                         util.UniqueID(),
		DisplayName:                plan.Title,
		Source:                     model.SubscriptionSourceSePay,
		Status:                     "active",
		StatusFormatted:            "Active",
		RenewsAt:                   renewsAt,
		TrialEndsAt:                null.Time{},
		EndsAt:                     null.Time{},
		CreatedAt:                  now,
		UpdatedAt:                  now,
		UserID:                     app.OwnerUserID,
		LemonsqueezySubscriptionID: null.StringFrom(session.PaymentID),
		LemonsqueezyCustomerID:     null.String{},
		LemonsqueezyOrderID:        null.StringFrom(firstNonEmpty(req.ReferenceCode, fmt.Sprintf("%d", req.ID))),
		LemonsqueezyProductID:      null.StringFrom(plan.ID),
		LemonsqueezyVariantID:      null.String{},
	})
	if err != nil {
		slog.Error(
			"Failed to upsert sepay subscription",
			slog.String("payment_id", session.PaymentID),
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
		return nil, fmt.Errorf("failed to upsert subscription entitlement: %w", err)
	}

	if _, err := h.paymentSessionStore.MarkPaymentSessionPaid(c.Context(), session.PaymentID, firstNonEmpty(req.ReferenceCode, fmt.Sprintf("%d", req.ID)), string(body), now); err != nil {
		return nil, fmt.Errorf("failed to mark payment session paid: %w", err)
	}

	return &wire.BillingWebhookResponse{}, nil
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
