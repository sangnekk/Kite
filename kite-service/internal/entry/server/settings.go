package server

import (
	"github.com/kitecloud/kite/kite-service/internal/config"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
)

// seedSettings converts the legacy kite.toml values into the initial database
// settings. It is only used for namespaces that do not exist in the database
// yet; afterwards the database is the source of truth.
func seedSettings(cfg *config.Config) settings.Snapshot {
	b := cfg.Billing

	providers := make([]settings.AIProvider, len(cfg.AI.Providers))
	for i, p := range cfg.AI.Providers {
		models := make([]settings.AIModel, len(p.Models))
		for j, m := range p.Models {
			models[j] = settings.AIModel{Key: m.Key, Name: m.Name, Model: m.Model, Credits: m.Credits}
		}
		providers[i] = settings.AIProvider{ID: p.ID, API: p.API, BaseURL: p.BaseURL, APIKey: p.APIKey, Models: models}
	}

	return settings.Snapshot{
		Billing: settings.Billing{
			MerchantBankName:   b.MerchantBankName,
			MerchantAccountNo:  b.MerchantAccountNo,
			CheckoutTTLMinutes: b.CheckoutTTLMinutes,
			SePaySecretKey:     b.SePaySecretKey,
		},
		Limits: settings.Limits{
			MaxAppsPerUser: cfg.UserLimits.MaxAppsPerUser,
			MaxAssetSize:   cfg.UserLimits.MaxAssetSize,
		},
		Discord: settings.Discord{
			BotToken: cfg.Discord.BotToken,
			GuildID:  cfg.Discord.GuildID,
		},
		Engine: settings.Engine{
			MaxStackDepth:               cfg.Engine.MaxStackDepth,
			MaxOperations:               cfg.Engine.MaxOperations,
			MaxCredits:                  cfg.Engine.MaxCredits,
			ComponentResumePointTTLDays: cfg.Engine.ComponentResumePointTTLDays,
		},
		AI: settings.AI{
			DefaultModel: cfg.AI.DefaultModel,
			Providers:    providers,
		},
	}
}
