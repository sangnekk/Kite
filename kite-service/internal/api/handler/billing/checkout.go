package billing

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/handler/billing/payment"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

func (h *BillingHandler) HandleAppCheckout(c *handler.Context, req wire.BillingCheckoutRequest) (*wire.BillingCheckoutResponse, error) {
	planID := strings.TrimSpace(req.PlanID)

	plan := h.planManager.PlanByID(planID)
	if plan == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	amount := plan.PaymentAmount
	if amount <= 0 {
		amount = int(plan.Price)
	}

	if h.paymentSessionStore == nil {
		return nil, fmt.Errorf("payment session store is not configured")
	}
	if strings.TrimSpace(h.config.MerchantAccountNo) == "" {
		return nil, fmt.Errorf("merchant account no is not configured")
	}
	if strings.TrimSpace(h.config.MerchantBankName) == "" {
		return nil, fmt.Errorf("merchant bank name is not configured")
	}

	seq, err := h.paymentSessionStore.NextPaymentSequence(c.Context())
	if err != nil {
		return nil, fmt.Errorf("failed to allocate payment sequence: %w", err)
	}

	paymentID := payment.EncodeInvoiceNumber(seq)
	qrContent := paymentID
	qrImageURL := buildSePayQRCodeURL(h.config.MerchantAccountNo, h.config.MerchantBankName, amount, qrContent)
	now := time.Now().UTC()

	if _, err := h.paymentSessionStore.CreatePaymentSession(c.Context(), model.PaymentSession{
		ID:         util.UniqueID(),
		Seq:        seq,
		Provider:   "sepay",
		PaymentID:  paymentID,
		AppID:      c.App.ID,
		PlanID:     plan.ID,
		Amount:     amount,
		QRImageURL: qrImageURL,
		QRContent:  qrContent,
		Status:     model.PaymentSessionStatusPending,
		CreatedAt:  now,
		UpdatedAt:  now,
	}); err != nil {
		return nil, fmt.Errorf("failed to create payment session: %w", err)
	}

	// Supersede every older still-pending checkout for this app: only the latest
	// one (this session) stays valid. A transfer against a superseded id will be
	// rejected by the IPN handler (and alerted via Discord).
	if err := h.paymentSessionStore.FailPendingPaymentSessionsForApp(c.Context(), c.App.ID, paymentID, now); err != nil {
		return nil, fmt.Errorf("failed to supersede previous payment sessions: %w", err)
	}

	return &wire.BillingCheckoutResponse{
		ActionURL:        qrImageURL,
		Method:           "GET",
		PaymentID:        paymentID,
		QRCodeURL:        qrImageURL,
		PaymentContent:   qrContent,
		PaymentStatusURL: fmt.Sprintf("/v1/apps/%s/billing/checkouts/%s?plan_id=%s", c.App.ID, paymentID, url.QueryEscape(plan.ID)),
		BankName:         strings.TrimSpace(h.config.MerchantBankName),
		AccountNumber:    strings.TrimSpace(h.config.MerchantAccountNo),
		Amount:           amount,
		ExpiresAt:        now.Add(time.Duration(h.config.CheckoutTTLMinutes) * time.Minute),
	}, nil
}

func buildSePayQRCodeURL(accountNo, bankName string, amount int, content string) string {
	values := url.Values{}
	values.Set("acc", strings.TrimSpace(accountNo))
	values.Set("bank", strings.TrimSpace(bankName))
	if amount > 0 {
		values.Set("amount", strconv.Itoa(amount))
	}
	if strings.TrimSpace(content) != "" {
		values.Set("des", strings.TrimSpace(content))
	}
	return "https://qr.sepay.vn/img?" + values.Encode()
}
