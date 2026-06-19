package server

import (
	"log/slog"
	"net/http"
	"net/url"

	"github.com/diamondburned/arikawa/v3/api"
	"github.com/diamondburned/arikawa/v3/utils/httputil"
	"github.com/kitecloud/kite/kite-service/internal/config"
	"github.com/kitecloud/kite/kite-service/internal/core/engine"
	"github.com/kitecloud/kite/kite-service/pkg/provider"
)

func patchDiscordProxyURL(cfg *config.Config) {
	if cfg.Discord.ProxyURL == "" {
		return
	}

	slog.Info("Using Proxy for Discord API", "url", cfg.Discord.ProxyURL)

	httputil.Retries = 10

	api.BaseEndpoint = cfg.Discord.ProxyURL
	api.Endpoint = api.BaseEndpoint + api.Path + "/"
	api.EndpointGateway = api.Endpoint + "gateway"
	api.EndpointGatewayBot = api.EndpointGateway + "/bot"
	api.EndpointApplications = api.Endpoint + "applications/"
	api.EndpointChannels = api.Endpoint + "channels/"
	api.EndpointGuilds = api.Endpoint + "guilds/"
	api.EndpointUsers = api.Endpoint + "users/"
	api.EndpointWebhooks = api.Endpoint + "webhooks/"
	api.EndpointInvites = api.Endpoint + "invites/"
	api.EndpointInteractions = api.Endpoint + "interactions/"
	api.EndpointStageInstances = api.Endpoint + "stage-instances/"
	api.EndpointMe = api.Endpoint + "users/@me"
	api.EndpointAuth = api.Endpoint + "auth/"
	api.EndpointLogin = api.EndpointAuth + "login"
	api.EndpointTOTP = api.EndpointAuth + "mfa/totp"
}

func engineHTTPClient(cfg *config.Config) *http.Client {
	if cfg.Engine.HTTPProxyURL != "" {
		proxyURL, err := url.Parse(cfg.Engine.HTTPProxyURL)
		if err != nil {
			slog.With("error", err).Error("Failed to parse proxy URL")
			return nil
		}

		slog.Info("Using HTTP proxy for Engine", "url", cfg.Engine.HTTPProxyURL)

		return &http.Client{
			Transport: &http.Transport{
				Proxy: http.ProxyURL(proxyURL),
			},
		}
	}

	return &http.Client{}
}

// buildAIProvider constructs the AI model registry and the multi-provider
// router from configuration. Providers without an api_key are skipped so their
// models never surface in the picker. A legacy bare [openai] api_key with no
// [ai] providers configured falls back to the built-in OpenAI model set.
func buildAIProvider(cfg *config.Config, httpClient *http.Client) (*engine.AIProvider, *provider.AIModelRegistry) {
	var conns []engine.AIProviderConn
	var models []provider.AIModel

	for _, pc := range cfg.AI.Providers {
		if pc.APIKey == "" {
			slog.Warn("Skipping AI provider without api_key", slog.String("provider", pc.ID))
			continue
		}

		apiType := provider.AIModelAPIType(pc.API)
		conns = append(conns, engine.AIProviderConn{
			ID:      pc.ID,
			APIType: apiType,
			BaseURL: pc.BaseURL,
			APIKey:  pc.APIKey,
		})

		for _, mc := range pc.Models {
			models = append(models, provider.AIModel{
				Key:        mc.Key,
				Name:       mc.Name,
				Model:      mc.Model,
				Credits:    mc.Credits,
				ProviderID: pc.ID,
				API:        apiType,
			})
		}
	}

	if len(models) == 0 && cfg.OpenAI.APIKey != "" {
		const legacyID = "openai"
		conns = append(conns, engine.AIProviderConn{
			ID:      legacyID,
			APIType: provider.AIModelAPIOpenAI,
			APIKey:  cfg.OpenAI.APIKey,
		})
		for _, m := range defaultOpenAIModels() {
			m.ProviderID = legacyID
			m.API = provider.AIModelAPIOpenAI
			models = append(models, m)
		}
	}

	registry := provider.NewAIModelRegistry(models, cfg.AI.DefaultModel)
	return engine.NewMultiAIProvider(registry, conns, httpClient), registry
}

// defaultOpenAIModels mirrors the previously hardcoded OpenAI model set, keyed
// by the same model spelling that existing flows already store.
func defaultOpenAIModels() []provider.AIModel {
	return []provider.AIModel{
		{Key: "gpt-4.1", Name: "GPT-4.1", Model: "gpt-4.1", Credits: 100},
		{Key: "gpt-4.1-mini", Name: "GPT-4.1 Mini", Model: "gpt-4.1-mini", Credits: 20},
		{Key: "gpt-4.1-nano", Name: "GPT-4.1 Nano", Model: "gpt-4.1-nano", Credits: 5},
		{Key: "gpt-4o-mini", Name: "GPT-4o Mini", Model: "gpt-4o-mini", Credits: 5},
	}
}
