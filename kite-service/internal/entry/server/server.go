package server

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/kitecloud/kite/kite-service/internal/api"
	"github.com/kitecloud/kite/kite-service/internal/config"
	"github.com/kitecloud/kite/kite-service/internal/core/command"
	"github.com/kitecloud/kite/kite-service/internal/core/engine"
	"github.com/kitecloud/kite/kite-service/internal/core/event"
	"github.com/kitecloud/kite/kite-service/internal/core/gateway"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/core/usage"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres"
	"github.com/kitecloud/kite/kite-service/internal/db/s3"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
	"github.com/kitecloud/kite/kite-service/pkg/plugin/counting"
	"github.com/kitecloud/kite/kite-service/pkg/plugin/starboard"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

func StartServer(c context.Context, cfg *config.Config) error {
	patchDiscordProxyURL(cfg)

	pg, err := postgres.New(postgres.BuildConnectionDSN(cfg.Database.Postgres), cfg.ClusterCount)
	if err != nil {
		slog.With("error", err).Error("Failed to create postgres client")
		return fmt.Errorf("failed to create postgres client: %w", err)
	}

	s3Client, err := s3.New(cfg.Database.S3)
	if err != nil {
		slog.With("error", err).Error("Failed to create S3 client")
		return fmt.Errorf("failed to create S3 client: %w", err)
	}

	assetStore, err := postgres.NewAssetStore(context.Background(), pg, s3Client)
	if err != nil {
		slog.With("error", err).Warn("Failed to create asset store, continuing without support for assets")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	tokenCrypt, err := util.NewSymmetricCrypt(cfg.Encryption.TokenEncryptionKey)
	if err != nil {
		slog.With("error", err).Error("Failed to create token crypt")
		return fmt.Errorf("failed to create token crypt: %w", err)
	}

	engineHTTP := engineHTTPClient(cfg)
	aiProvider, aiRegistry := buildAIProvider(cfg, engineHTTP)
	provider.SetDefaultModelRegistry(aiRegistry)

	pluginRegistry := plugin.NewRegistry()
	pluginRegistry.Register(
		counting.NewCountingPlugin(),
		starboard.NewStarboardPlugin(),
	)

	eng := engine.NewEngine(
		engine.Env{
			Config: engine.EngineConfig{
				MaxStackDepth: cfg.Engine.MaxStackDepth,
				MaxOperations: cfg.Engine.MaxOperations,
				MaxCredits:    cfg.Engine.MaxCredits,
				ClusterCount:  cfg.ClusterCount,
				ClusterIndex:  cfg.ClusterIndex,
			},
			AppStore:             pg,
			AppSettingsStore:     pg,
			AssetStore:           assetStore,
			LogStore:             pg,
			UsageStore:           pg,
			MessageStore:         pg,
			MessageInstanceStore: pg,
			CommandStore:         pg,
			EventListenerStore:   pg,
			PluginInstanceStore:  pg,
			PluginValueStore:     pg,
			PluginRegistry:       pluginRegistry,
			VariableValueStore:   pg,
			ResumePointStore:     pg,
			HttpClient:           engineHTTP,
			AIProvider:           aiProvider,
			TokenCrypt:           tokenCrypt,
		},
	)
	eng.Run(ctx)

	commandManager := command.NewCommandManager(pg, pg, pg, pg, pluginRegistry, tokenCrypt)

	handler := event.NewEventHandlerWrapper(eng, pg)

	billingPlans := make([]model.Plan, len(cfg.Billing.Plans))
	for i, plan := range cfg.Billing.Plans {
		billingPlans[i] = model.Plan(plan)
	}

	planManager := plan.NewPlanManager(pg, pg, pg, billingPlans, plan.PlanManagerConfig{
		DiscordBotToken: cfg.Discord.BotToken,
		DiscordGuildID:  cfg.Discord.GuildID,
	})

	gatewayMgr := gateway.NewGatewayManager(pg, pg, planManager, handler, tokenCrypt, gateway.GatewayManagerConfig{
		ClusterCount: cfg.ClusterCount,
		ClusterIndex: cfg.ClusterIndex,
	})
	gatewayMgr.Run(ctx)

	eng.SetSessionLookup(gatewayMgr)

	usageMgr := usage.NewUsageManager(pg, pg, pg, planManager)

	if cfg.IsPrimaryCluster() {
		planManager.Run(ctx)
		usageMgr.Run(ctx)
	}

	apiServer := api.NewAPIServer(api.APIServerConfig{
		ClusterCount:        cfg.ClusterCount,
		ClusterIndex:        cfg.ClusterIndex,
		SecureCookies:       cfg.API.SecureCookies,
		StrictCookies:       cfg.API.StrictCookies,
		CookieDomain:        cfg.API.CookieDomain,
		APIPublicBaseURL:    cfg.API.PublicBaseURL,
		AppPublicBaseURL:    cfg.App.PublicBaseURL,
		AppAllowedOrigins:   cfg.App.AllowedOrigins,
		DiscordClientID:     cfg.Discord.ClientID,
		DiscordClientSecret: cfg.Discord.ClientSecret,
		WebhookBaseURL:      cfg.API.WebhookBaseURL,
		InternalSecret:      cfg.API.InternalSecret,
		UserLimits: api.APIUserLimitsConfig{
			MaxAppsPerUser: cfg.UserLimits.MaxAppsPerUser,
		},
		Billing: api.BillingConfig{
			WebhookHMACSecret:       cfg.Billing.WebhookHMACSecret,
			TransferCodePrefix:      cfg.Billing.TransferCodePrefix,
			MerchantBankName:        cfg.Billing.MerchantBankName,
			MerchantAccountNo:       cfg.Billing.MerchantAccountNo,
			CheckoutTTLMinutes:      cfg.Billing.CheckoutTTLMinutes,
			SePayMerchantID:         cfg.Billing.SePayMerchantID,
			SePaySecretKey:          cfg.Billing.SePaySecretKey,
			SePayCheckoutBaseURL:    cfg.Billing.SePayCheckoutBaseURL,
			SePayAPIBaseURL:         cfg.Billing.SePayAPIBaseURL,
			SePayBearerToken:        cfg.Billing.SePayBearerToken,
			SePayBankAccountXID:     cfg.Billing.SePayBankAccountXID,
			SePayVaPrefix:           cfg.Billing.SePayVaPrefix,
			SePayQRCodeTemplate:     cfg.Billing.SePayQRCodeTemplate,
			SePayWithQRCode:         cfg.Billing.SePayWithQRCode,
			SePayCheckoutTTLMinutes: cfg.Billing.SePayCheckoutTTLMinutes,
			Plans:                   cfg.Billing.Plans,
		},
	},
		pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg,
		assetStore, gatewayMgr, planManager, pluginRegistry, tokenCrypt, commandManager,
		aiRegistry, pg, eng,
	)
	address := fmt.Sprintf("%s:%d", cfg.API.Host, cfg.API.Port)
	if err := apiServer.Serve(ctx, address); err != nil {
		slog.With("error", err).Error("Failed to start API server")
		return fmt.Errorf("failed to start API server: %w", err)
	}

	return nil
}
