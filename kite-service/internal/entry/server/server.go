package server

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api"
	"github.com/kitecloud/kite/kite-service/internal/config"
	"github.com/kitecloud/kite/kite-service/internal/core/command"
	"github.com/kitecloud/kite/kite-service/internal/core/engine"
	"github.com/kitecloud/kite/kite-service/internal/core/event"
	"github.com/kitecloud/kite/kite-service/internal/core/gateway"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
	"github.com/kitecloud/kite/kite-service/internal/core/usage"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres"
	"github.com/kitecloud/kite/kite-service/internal/db/s3"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/kitecloud/kite/kite-service/pkg/plugin"
	"github.com/kitecloud/kite/kite-service/pkg/plugin/counting"
	"github.com/kitecloud/kite/kite-service/pkg/plugin/spamcatcher"
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

	// Runtime settings live in the database (seeded from kite.toml on first run).
	settingsMgr, err := settings.NewManager(ctx, pg, tokenCrypt, seedSettings(cfg))
	if err != nil {
		slog.With("error", err).Error("Failed to load settings")
		return fmt.Errorf("failed to load settings: %w", err)
	}
	settingsMgr.RunReload(ctx)
	runtimeSettings := settingsMgr.Snapshot()

	engineHTTP := engineHTTPClient(cfg)
	aiProvider, aiRegistry := buildAIProvider(runtimeSettings.AI, cfg.OpenAI.APIKey, engineHTTP)
	provider.SetDefaultModelRegistry(aiRegistry)

	pluginRegistry := plugin.NewRegistry()
	pluginRegistry.Register(
		counting.NewCountingPlugin(),
		starboard.NewStarboardPlugin(),
		spamcatcher.NewSpamCatcherPlugin(),
	)

	eng := engine.NewEngine(
		engine.Env{
			Config: engine.EngineConfig{
				MaxStackDepth: runtimeSettings.Engine.MaxStackDepth,
				MaxOperations: runtimeSettings.Engine.MaxOperations,
				MaxCredits:    runtimeSettings.Engine.MaxCredits,
				ClusterCount:  cfg.ClusterCount,
				ClusterIndex:  cfg.ClusterIndex,

				ComponentResumePointTTL: time.Duration(runtimeSettings.Engine.ComponentResumePointTTLDays) * 24 * time.Hour,
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
			CustomEventStore:     pg,
			CustomTableStore:     pg,
			ScheduleStore:        pg,
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

	// The plans live in the database; kite.toml is only used to seed an empty table.
	planManager, err := plan.NewPlanManager(ctx, pg, pg, pg, pg, billingPlans, plan.PlanManagerConfig{
		Discord: func() (string, string) {
			d := settingsMgr.Discord()
			return d.BotToken, d.GuildID
		},
	})
	if err != nil {
		slog.With("error", err).Error("Failed to create plan manager")
		return fmt.Errorf("failed to create plan manager: %w", err)
	}
	planManager.RunReload(ctx)

	gatewayMgr := gateway.NewGatewayManager(pg, pg, planManager, handler, tokenCrypt, gateway.GatewayManagerConfig{
		ClusterCount: cfg.ClusterCount,
		ClusterIndex: cfg.ClusterIndex,
	})
	gatewayMgr.Run(ctx)

	eng.SetSessionLookup(gatewayMgr)
	eng.SetFeatureLookup(planManager)

	// The scheduler runs on every cluster (sharded by app id like the engine), not
	// just the primary one: a scheduled flow must execute on the cluster that owns
	// the app's gateway session. It's started after SetSessionLookup so fired flows
	// can look up their bot session.
	eng.RunScheduler(ctx)

	usageMgr := usage.NewUsageManager(pg, pg, pg, planManager)

	if cfg.IsPrimaryCluster() {
		planManager.Run(ctx)
		usageMgr.Run(ctx)
		eng.RunResumePointCleanup(ctx)
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
		Settings:            settingsMgr,
	},
		pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg, pg,
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
