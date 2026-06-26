package webhookintegration

import (
	"errors"
	"fmt"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/api/wire"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

type WebhookIntegrationHandler struct {
	webhookIntegrationStore store.WebhookIntegrationStore
	webhookBaseURL          string
}

func NewWebhookIntegrationHandler(
	webhookIntegrationStore store.WebhookIntegrationStore,
	webhookBaseURL string,
) *WebhookIntegrationHandler {
	return &WebhookIntegrationHandler{
		webhookIntegrationStore: webhookIntegrationStore,
		webhookBaseURL:          webhookBaseURL,
	}
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationList(c *handler.Context) (*wire.WebhookIntegrationListResponse, error) {
	integrations, err := h.webhookIntegrationStore.WebhookIntegrationsByApp(c.Context(), c.App.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhook integrations: %w", err)
	}

	res := make([]*wire.WebhookIntegration, len(integrations))
	for i, integration := range integrations {
		res[i] = wire.WebhookIntegrationToWire(integration, h.webhookBaseURL, c.App.DiscordID)
	}
	return &res, nil
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationGet(c *handler.Context) (*wire.WebhookIntegrationGetResponse, error) {
	return wire.WebhookIntegrationToWire(c.WebhookIntegration, h.webhookBaseURL, c.App.DiscordID), nil
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationCreate(c *handler.Context, req wire.WebhookIntegrationCreateRequest) (*wire.WebhookIntegrationCreateResponse, error) {
	secret := req.Secret
	if secret == "" {
		secret = util.UniqueID()
	}

	now := time.Now().UTC()
	integration, err := h.webhookIntegrationStore.CreateWebhookIntegration(c.Context(), &model.WebhookIntegration{
		ID:        util.UniqueID(),
		AppID:     c.App.ID,
		Type:      model.WebhookIntegrationType(req.Type),
		Secret:    secret,
		Enabled:   false,
		CreatedAt: now,
		UpdatedAt: now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create webhook integration: %w", err)
	}

	return wire.WebhookIntegrationToWire(integration, h.webhookBaseURL, c.App.DiscordID), nil
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationUpdate(c *handler.Context, req wire.WebhookIntegrationUpdateRequest) (*wire.WebhookIntegrationUpdateResponse, error) {
	secret := req.Secret
	if secret == "" {
		secret = c.WebhookIntegration.Secret
	}

	integration, err := h.webhookIntegrationStore.UpdateWebhookIntegration(c.Context(), &model.WebhookIntegration{
		ID:        c.WebhookIntegration.ID,
		Secret:    secret,
		Enabled:   c.WebhookIntegration.Enabled,
		UpdatedAt: time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_webhook_integration", "Webhook integration not found")
		}
		return nil, fmt.Errorf("failed to update webhook integration: %w", err)
	}

	return wire.WebhookIntegrationToWire(integration, h.webhookBaseURL, c.App.DiscordID), nil
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationUpdateEnabled(c *handler.Context, req wire.WebhookIntegrationUpdateEnabledRequest) (*wire.WebhookIntegrationUpdateEnabledResponse, error) {
	integration, err := h.webhookIntegrationStore.UpdateWebhookIntegration(c.Context(), &model.WebhookIntegration{
		ID:        c.WebhookIntegration.ID,
		Secret:    c.WebhookIntegration.Secret,
		Enabled:   req.Enabled,
		UpdatedAt: time.Now().UTC(),
	})
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_webhook_integration", "Webhook integration not found")
		}
		return nil, fmt.Errorf("failed to update webhook integration: %w", err)
	}

	return wire.WebhookIntegrationToWire(integration, h.webhookBaseURL, c.App.DiscordID), nil
}

func (h *WebhookIntegrationHandler) HandleWebhookIntegrationDelete(c *handler.Context) (*wire.WebhookIntegrationDeleteResponse, error) {
	err := h.webhookIntegrationStore.DeleteWebhookIntegration(c.Context(), c.WebhookIntegration.ID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, handler.ErrNotFound("unknown_webhook_integration", "Webhook integration not found")
		}
		return nil, fmt.Errorf("failed to delete webhook integration: %w", err)
	}

	return &wire.WebhookIntegrationDeleteResponse{}, nil
}
