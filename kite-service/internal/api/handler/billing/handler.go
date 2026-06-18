package billing

import (
	"os"

	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type BillingHandlerConfig struct {
	WebhookHMACSecret       string
	TransferCodePrefix      string
	MerchantBankName        string
	MerchantAccountNo       string
	CheckoutTTLMinutes      int
	SePayMerchantID         string
	SePaySecretKey          string
	SePayCheckoutBaseURL    string
	SePayAPIBaseURL         string
	SePayBearerToken        string
	SePayBankAccountXID     string
	SePayVaPrefix           string
	SePayQRCodeTemplate     string
	SePayWithQRCode         bool
	SePayCheckoutTTLMinutes int
	AppPublicBaseURL        string
}

type BillingHandler struct {
	config              BillingHandlerConfig
	paymentSessionStore store.PaymentSessionStore
	sepay               *sepayClient
	appStore            store.AppStore
	userStore           store.UserStore
	subscriptionStore   store.SubscriptionStore
	entitlementStore    store.EntitlementStore
	planManager         *plan.PlanManager
	discordNotifier     *discordNotifier
}

func NewBillingHandler(
	config BillingHandlerConfig,
	paymentSessionStore store.PaymentSessionStore,
	appStore store.AppStore,
	userStore store.UserStore,
	subscriptionStore store.SubscriptionStore,
	entitlementStore store.EntitlementStore,
	planManager *plan.PlanManager,
) *BillingHandler {
	if config.TransferCodePrefix == "" {
		config.TransferCodePrefix = "KITE"
	}

	if config.CheckoutTTLMinutes <= 0 {
		config.CheckoutTTLMinutes = 30
	}

	if config.SePayCheckoutBaseURL == "" {
		config.SePayCheckoutBaseURL = "https://pay.sepay.vn"
	}

	if config.SePayAPIBaseURL == "" {
		config.SePayAPIBaseURL = "https://userapi.sepay.vn/v2"
	}

	if config.SePayCheckoutTTLMinutes <= 0 {
		config.SePayCheckoutTTLMinutes = 30
	}

	return &BillingHandler{
		config:              config,
		paymentSessionStore: paymentSessionStore,
		sepay:               newSePayClient(config.SePayAPIBaseURL, config.SePayBearerToken),
		appStore:            appStore,
		userStore:           userStore,
		subscriptionStore:   subscriptionStore,
		entitlementStore:    entitlementStore,
		planManager:         planManager,
		discordNotifier:     newDiscordNotifier(os.Getenv("DISCORD_ERROR_WEBHOOK_URL")),
	}
}
