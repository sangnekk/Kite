package api

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/kitecloud/kite/kite-service/internal/config"
	"github.com/kitecloud/kite/kite-service/internal/core/command"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
	"github.com/rs/cors"
)

type APIServerConfig struct {
	ClusterCount        int
	ClusterIndex        int
	SecureCookies       bool
	StrictCookies       bool
	CookieDomain        string
	AppPublicBaseURL    string
	AppAllowedOrigins   []string
	APIPublicBaseURL    string
	DiscordClientID     string
	DiscordClientSecret string
	UserLimits          APIUserLimitsConfig
	Billing             BillingConfig
}

type APIUserLimitsConfig struct {
	MaxAppsPerUser int
	MaxAssetSize   int
}

type BillingConfig struct {
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
	Plans                   []config.BillingPlanConfig
}

type APIServer struct {
	config APIServerConfig
	mux    *http.ServeMux
	server *http.Server
}

func NewAPIServer(
	config APIServerConfig,
	userStore store.UserStore,
	sessionStore store.SessionStore,
	appStore store.AppStore,
	logStore store.LogStore,
	usageStore store.UsageStore,
	commandStore store.CommandStore,
	variableStore store.VariableStore,
	variableValueStore store.VariableValueStore,
	messageStore store.MessageStore,
	messageInstanceStore store.MessageInstanceStore,
	eventListenerStore store.EventListenerStore,
	pluginInstanceStore store.PluginInstanceStore,
	subscriptionStore store.SubscriptionStore,
	paymentSessionStore store.PaymentSessionStore,
	entitlementStore store.EntitlementStore,
	assetStore store.AssetStore,
	appStateManager store.AppStateManager,
	planManager *plan.PlanManager,
	pluginRegistry *plugin.Registry,
	tokenCrypt *util.SymmetricCrypt,
	commandManager *command.CommandManager,
	aiModelRegistry *provider.AIModelRegistry,
	aiProvider provider.AIProvider,
	aiConversationStore store.AIConversationStore,
) *APIServer {
	s := &APIServer{
		config: config,
		mux:    http.NewServeMux(),
	}
	s.RegisterRoutes(
		userStore,
		sessionStore,
		appStore,
		logStore,
		usageStore,
		commandStore,
		variableStore,
		variableValueStore,
		messageStore,
		messageInstanceStore,
		eventListenerStore,
		pluginInstanceStore,
		subscriptionStore,
		paymentSessionStore,
		entitlementStore,
		assetStore,
		appStateManager,
		planManager,
		pluginRegistry,
		tokenCrypt,
		commandManager,
		aiModelRegistry,
		aiProvider,
		aiConversationStore,
	)
	return s
}

func (s *APIServer) Serve(ctx context.Context, address string) error {
	allowedOrigins := append([]string{s.config.AppPublicBaseURL}, s.config.AppAllowedOrigins...)
	handler := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
	}).Handler(s.mux)

	s.server = &http.Server{
		Addr:    address,
		Handler: handler,
	}

	slog.With("address", address).Info("Starting API server")
	if err := s.server.ListenAndServe(); err != nil {
		return err
	}

	return nil
}

func (s *APIServer) Shutdown(ctx context.Context) error {
	if err := s.server.Shutdown(ctx); err != nil {
		return err
	}

	return nil
}
