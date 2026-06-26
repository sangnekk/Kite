package webhookevent

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

type WebhookEngine interface {
	HandleWebhookEvent(appID string, source model.WebhookIntegrationType, payload json.RawMessage)
}

type WebhookEventHandler struct {
	webhookIntegrationStore store.WebhookIntegrationStore
	internalSecret          string
	engine                  WebhookEngine
}

func NewWebhookEventHandler(
	webhookIntegrationStore store.WebhookIntegrationStore,
	internalSecret string,
	engine WebhookEngine,
) *WebhookEventHandler {
	return &WebhookEventHandler{
		webhookIntegrationStore: webhookIntegrationStore,
		internalSecret:          internalSecret,
		engine:                  engine,
	}
}

type IncomingWebhookRequest struct {
	IntegrationID string          `json:"integration_id"`
	Headers       map[string]string `json:"headers"`
	RawPayload    json.RawMessage `json:"raw_payload"`
}

func (h *WebhookEventHandler) HandleIncomingWebhook(c *handler.Context, body json.RawMessage) (*wire.Empty, error) {
	if h.internalSecret != "" {
		secret := strings.TrimSpace(c.Header("X-Internal-Secret"))
		if secret != h.internalSecret {
			return nil, handler.ErrUnauthorized("unauthorized", "invalid internal secret")
		}
	}

	var req IncomingWebhookRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return nil, handler.ErrBadRequest("invalid_request", fmt.Sprintf("failed to decode request: %v", err))
	}

	integration, err := h.webhookIntegrationStore.WebhookIntegration(c.Context(), req.IntegrationID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_integration", "Webhook integration not found")
		}
		return nil, fmt.Errorf("failed to get webhook integration: %w", err)
	}

	if !integration.Enabled {
		return &wire.Empty{}, nil
	}

	if err := validateWebhookSecret(integration, req.Headers); err != nil {
		return nil, handler.ErrUnauthorized("invalid_secret", err.Error())
	}

	slog.Info(
		"Received webhook event",
		slog.String("integration_id", integration.ID),
		slog.String("app_id", integration.AppID),
		slog.String("type", string(integration.Type)),
	)

	go h.engine.HandleWebhookEvent(integration.AppID, integration.Type, req.RawPayload)

	return &wire.Empty{}, nil
}

func validateWebhookSecret(integration *model.WebhookIntegration, headers map[string]string) error {
	secret := integration.Secret
	if secret == "" {
		return nil
	}

	switch integration.Type {
	case model.WebhookIntegrationTypeSePay:
		authHeader := strings.TrimSpace(headers["Authorization"])
		secretHeader := strings.TrimSpace(headers["X-Secret-Key"])
		if authHeader != "Apikey "+secret && authHeader != "APIKEY "+secret && secretHeader != secret {
			return fmt.Errorf("invalid API key")
		}
	case model.WebhookIntegrationTypeThueAPIBank:
		sig := strings.TrimSpace(headers["signature"])
		if sig != secret {
			return fmt.Errorf("invalid signature")
		}
	case model.WebhookIntegrationTypeCustom:
		key := strings.TrimSpace(headers["X-Sec-Key"])
		if key != secret {
			return fmt.Errorf("invalid secret key")
		}
	}

	return nil
}
