package billing

import (
	"fmt"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/handler/billing/payment"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
)

func (h *BillingHandler) HandleAppCheckoutStatus(c *handler.Context) (*wire.BillingCheckoutStatusResponse, error) {
	paymentID := strings.TrimSpace(c.Param("paymentID"))
	planID := strings.TrimSpace(c.Query("plan_id"))
	if paymentID == "" || planID == "" {
		return nil, handler.ErrBadRequest("invalid_request", "payment_id and plan_id are required")
	}

	invoiceParts, ok := payment.DecodeInvoiceNumber(paymentID)
	if !ok {
		return nil, handler.ErrBadRequest("invalid_invoice", "invalid invoice number")
	}

	if invoiceParts.PlanID != planID {
		return nil, handler.ErrBadRequest("plan_mismatch", "plan_id does not match invoice")
	}

	plan := h.planManager.PlanByID(planID)
	if plan == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	if h.paymentSessionStore == nil {
		return nil, fmt.Errorf("payment session store is not configured")
	}

	session, err := h.paymentSessionStore.PaymentSession(c.Context(), paymentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load payment session: %w", err)
	}

	if session.PlanID != planID {
		return nil, handler.ErrBadRequest("plan_mismatch", "plan_id does not match payment")
	}

	if session.AppID != c.App.ID {
		return nil, handler.ErrBadRequest("app_mismatch", "payment does not belong to this app")
	}

	status := strings.TrimSpace(string(session.Status))
	paid := strings.EqualFold(status, "paid")
	if !paid {
		return &wire.BillingCheckoutStatusResponse{
			PaymentID:           paymentID,
			Status:              status,
			Paid:                false,
			Amount:              session.Amount,
			SubscriptionCreated: false,
		}, nil
	}

	return &wire.BillingCheckoutStatusResponse{
		PaymentID:           paymentID,
		Status:              status,
		Paid:                true,
		Amount:              session.Amount,
		SubscriptionCreated: true,
	}, nil
}
