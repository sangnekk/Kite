package billing

import (
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

func (h *BillingHandler) HandleAppCheckout(c *handler.Context, req wire.BillingCheckoutRequest) (*wire.BillingCheckoutResponse, error) {
	planID := req.PlanID

	plan := h.planManager.PlanByID(planID)
	if plan == nil {
		return nil, handler.ErrBadRequest("unknown_plan", "Unknown plan")
	}

	paymentID := util.UniqueID()
	transferCode := fmt.Sprintf("%s-%s-%s-%s", h.config.TransferCodePrefix, c.App.ID, plan.ID, paymentID)

	amount := plan.PaymentAmount
	if amount <= 0 {
		amount = int(plan.Price)
	}

	return &wire.BillingCheckoutResponse{
		URL:             fmt.Sprintf("%s/apps/%s/premium", h.config.AppPublicBaseURL, c.App.ID),
		PaymentID:       paymentID,
		BankName:        h.config.MerchantBankName,
		AccountNumber:   h.config.MerchantAccountNo,
		Amount:          amount,
		TransferContent: transferCode,
		ExpiresAt:       time.Now().UTC().Add(time.Duration(h.config.CheckoutTTLMinutes) * time.Minute),
	}, nil
}
