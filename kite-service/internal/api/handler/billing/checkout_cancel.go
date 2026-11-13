package billing

import (
	"fmt"
	"strings"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/handler/billing/payment"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

// HandleAppCheckoutCancel ends a payment the user gave up on, so its QR code
// can no longer be used: a transfer against it is rejected like one against a
// superseded code. Only a pending payment is cancelled. One that was already
// paid is reported as such (the money arrived first), and one that is already
// over answers with its status, so asking twice is harmless.
func (h *BillingHandler) HandleAppCheckoutCancel(c *handler.Context) (*wire.BillingCheckoutStatusResponse, error) {
	paymentID := strings.TrimSpace(c.Param("paymentID"))
	if paymentID == "" {
		return nil, handler.ErrBadRequest("invalid_request", "payment_id is required")
	}

	if _, ok := payment.DecodeInvoiceNumber(paymentID); !ok {
		return nil, handler.ErrBadRequest("invalid_invoice", "invalid invoice number")
	}

	if h.paymentSessionStore == nil {
		return nil, fmt.Errorf("payment session store is not configured")
	}

	session, err := h.paymentSessionStore.PaymentSession(c.Context(), paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load payment session: %w", err)
	}

	if session.AppID != c.App.ID {
		return nil, handler.ErrBadRequest("app_mismatch", "payment does not belong to this app")
	}

	if session.Status == model.PaymentSessionStatusPending {
		if _, err := h.paymentSessionStore.CancelPendingPaymentSession(c.Context(), c.App.ID, paymentID, time.Now().UTC()); err != nil {
			return nil, fmt.Errorf("failed to cancel payment session: %w", err)
		}

		// Read it again: the answer is what is stored, which is not "pending" when
		// the cancel won, and "paid" when the bank confirmed it first.
		session, err = h.paymentSessionStore.PaymentSession(c.Context(), paymentID)
		if err != nil {
			return nil, fmt.Errorf("failed to load payment session: %w", err)
		}
	}

	paid := session.Status == model.PaymentSessionStatusPaid

	return &wire.BillingCheckoutStatusResponse{
		PaymentID:           paymentID,
		Status:              strings.TrimSpace(string(session.Status)),
		Paid:                paid,
		Amount:              session.Amount,
		SubscriptionCreated: paid,
	}, nil
}
