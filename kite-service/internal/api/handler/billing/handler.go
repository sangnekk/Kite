package billing

import (
	"os"

	"github.com/kitecloud/kite/kite-service/internal/core/fulfillment"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

// BillingHandlerConfig is what the bank transfer flow needs. It is read on every
// use (see cfg) so changes made in the admin console apply without a restart.
type BillingHandlerConfig struct {
	MerchantBankName   string
	MerchantAccountNo  string
	CheckoutTTLMinutes int
	// SePaySecretKey authenticates the payment notifications (IPN) of SePay.
	SePaySecretKey string
}

type BillingHandler struct {
	// settings returns the live billing settings.
	settings            func() BillingHandlerConfig
	paymentSessionStore store.PaymentSessionStore
	appStore            store.AppStore
	userStore           store.UserStore
	subscriptionStore   store.SubscriptionStore
	entitlementStore    store.EntitlementStore
	planManager         *plan.PlanManager
	discordNotifier     *discordNotifier
	fulfiller           *fulfillment.Fulfiller
}

func NewBillingHandler(
	settings func() BillingHandlerConfig,
	paymentSessionStore store.PaymentSessionStore,
	appStore store.AppStore,
	userStore store.UserStore,
	subscriptionStore store.SubscriptionStore,
	entitlementStore store.EntitlementStore,
	planManager *plan.PlanManager,
) *BillingHandler {
	return &BillingHandler{
		settings:            settings,
		paymentSessionStore: paymentSessionStore,
		appStore:            appStore,
		userStore:           userStore,
		subscriptionStore:   subscriptionStore,
		entitlementStore:    entitlementStore,
		planManager:         planManager,
		fulfiller:           fulfillment.New(appStore, subscriptionStore, entitlementStore, paymentSessionStore, planManager),
		discordNotifier:     newDiscordNotifier(os.Getenv("DISCORD_ERROR_WEBHOOK_URL")),
	}
}

// cfg returns the current billing settings with defaults applied.
func (h *BillingHandler) cfg() BillingHandlerConfig {
	config := h.settings()

	if config.CheckoutTTLMinutes <= 0 {
		config.CheckoutTTLMinutes = 30
	}

	return config
}
