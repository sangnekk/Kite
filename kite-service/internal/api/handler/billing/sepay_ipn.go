package billing

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
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

	resp, err := h.processSePayIPN(c, body)
	if err != nil {
		// Alert ops about any authenticated transaction that failed to process
		// so it can be reconciled manually. Best-effort, never blocks the flow.
		h.notifySePayError(body, err)

		// A terminal failure (validation / business rule, i.e. a *handler.Error
		// with a 4xx status) will never succeed on retry. Ack it with 200 so
		// SePay stops re-sending the same IPN — otherwise every retry would also
		// re-fire the Discord alert. The webhook above already recorded it once.
		var handlerErr *handler.Error
		if errors.As(err, &handlerErr) && handlerErr.Status >= 400 && handlerErr.Status < 500 {
			slog.Warn(
				"Rejected SePay IPN",
				slog.String("code", handlerErr.Code),
				slog.String("error", err.Error()),
			)
			return &wire.BillingWebhookResponse{}, nil
		}

		// Transient/internal error (e.g. DB blip): surface it so SePay retries.
		return nil, err
	}
	return resp, err
}

func (h *BillingHandler) processSePayIPN(c *handler.Context, body json.RawMessage) (*wire.BillingWebhookResponse, error) {
	var req wire.BillingSePayIPNRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, handler.ErrBadRequest("invalid_request", fmt.Sprintf("failed to decode sepay ipn: %v", err))
	}

	if !strings.EqualFold(req.TransferType, "in") {
		return &wire.BillingWebhookResponse{}, nil
	}

	// Try every field that may carry the transfer memo and use the first one
	// that yields a valid invoice number. The `code` field is auto-extracted by
	// the bank/SePay and is frequently truncated (e.g. MBBank caps it), so the
	// full `content`/`description` fields are tried first.
	paymentID, ok := firstInvoiceNumber(req.Content, req.Description, derefString(req.Code), req.ReferenceCode)
	if !ok {
		return nil, handler.ErrBadRequest("invalid_invoice_number", "failed to parse invoice number")
	}
	if h.paymentSessionStore == nil {
		return nil, fmt.Errorf("payment session store is not configured")
	}

	// The transfer memo only carries the invoice id ("KITE<seq>"); the app and
	// plan come from the payment session created at checkout time. A transfer
	// for an unknown id is rejected (and alerted) rather than silently credited.
	session, err := h.paymentSessionStore.PaymentSession(c.Context(), paymentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, handler.ErrBadRequest("unknown_payment_session", fmt.Sprintf("no payment session for invoice %s", paymentID))
		}
		return nil, fmt.Errorf("failed to load payment session: %w", err)
	}

	// Only a pending session may be processed. A session that is already paid
	// (duplicate IPN) or failed/superseded (a newer checkout replaced it) is
	// rejected so we never double-credit or honor a stale QR code.
	if session.Status != model.PaymentSessionStatusPending {
		return nil, handler.ErrBadRequest("payment_session_not_pending", fmt.Sprintf("payment session %s is %s", paymentID, session.Status))
	}

	amount := int(req.TransferAmount)
	if amount != session.Amount {
		return nil, handler.ErrBadRequest("amount_mismatch", fmt.Sprintf("expected %d got %d", session.Amount, amount))
	}

	if strings.TrimSpace(req.AccountNumber) != strings.TrimSpace(h.config.MerchantAccountNo) {
		return nil, handler.ErrBadRequest("account_mismatch", "payment account does not match configured account")
	}

	plan := h.planManager.PlanByID(session.PlanID)
	if plan == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	app, err := h.appStore.App(c.Context(), session.AppID)
	if err != nil {
		return nil, fmt.Errorf("failed to load app: %w", err)
	}

	now := time.Now().UTC()

	// Reject a payment when the app already has any active plan (paid or manually
	// granted). Checkout creation guards this too, so reaching here is an anomaly
	// (e.g. a plan granted after checkout started) that needs manual handling
	// (refund) rather than stacking a parallel entitlement.
	activeEntitlements, err := h.entitlementStore.ActiveEntitlements(c.Context(), app.ID, now)
	if err != nil {
		return nil, fmt.Errorf("failed to load active entitlements: %w", err)
	}
	if len(activeEntitlements) > 0 {
		return nil, handler.ErrBadRequest("plan_already_active", fmt.Sprintf("app already has an active entitlement (plan %s)", activeEntitlements[0].PlanID))
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

	subscription, err := h.subscriptionStore.UpsertLemonSqueezySubscription(c.Context(), model.Subscription{
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

	entitlement := model.Entitlement{
		ID:             util.UniqueID(),
		Type:           "subscription",
		SubscriptionID: null.StringFrom(subscription.ID),
		AppID:          app.ID,
		PlanID:         plan.ID,
		CreatedAt:      now,
		UpdatedAt:      now,
		EndsAt:         endsAt,
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

// firstInvoiceNumber returns the first parseable KITE invoice number found
// across the provided fields. Banks split the transfer memo across several
// fields and may truncate some of them, so we cannot rely on field priority
// alone — we pick the first field that actually decodes to a valid invoice.
func firstInvoiceNumber(values ...string) (string, bool) {
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		if id, ok := payment.ExtractInvoiceNumber(value); ok {
			return id, true
		}
	}
	return "", false
}

// notifySePayError sends a Discord alert describing a failed SePay IPN so it
// can be reconciled manually. It is best-effort: no-op when the Discord webhook
// is not configured, and delivery happens in the background.
func (h *BillingHandler) notifySePayError(body json.RawMessage, processErr error) {
	if h.discordNotifier == nil {
		return
	}

	var req wire.BillingSePayIPNRequest
	_ = json.Unmarshal(body, &req) // best-effort, fields stay empty on failure

	fields := []discordEmbedField{
		{Name: "Lỗi", Value: truncateForDiscord(processErr.Error(), 1000), Inline: false},
	}
	if req.Gateway != "" {
		fields = append(fields, discordEmbedField{Name: "Ngân hàng", Value: req.Gateway, Inline: true})
	}
	if req.TransferAmount != 0 {
		fields = append(fields, discordEmbedField{Name: "Số tiền", Value: fmt.Sprintf("%d", req.TransferAmount), Inline: true})
	}
	if req.ReferenceCode != "" {
		fields = append(fields, discordEmbedField{Name: "Mã giao dịch", Value: req.ReferenceCode, Inline: true})
	}
	if content := firstNonEmpty(derefString(req.Code), req.Content, req.Description); content != "" {
		fields = append(fields, discordEmbedField{Name: "Nội dung CK", Value: truncateForDiscord(content, 1000), Inline: false})
	}
	if req.TransactionDate != "" {
		fields = append(fields, discordEmbedField{Name: "Thời gian", Value: req.TransactionDate, Inline: true})
	}

	h.discordNotifier.NotifyAsync(discordEmbed{
		Title:       "❌ Lỗi giao dịch SePay",
		Description: "Một webhook IPN từ SePay xử lý thất bại và cần được kiểm tra thủ công.",
		Color:       15548997, // red
		Fields:      fields,
	})
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
