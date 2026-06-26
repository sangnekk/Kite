package store

import (
	"context"

	"github.com/kitecloud/kite/kite-service/internal/model"
)

type WebhookIntegrationStore interface {
	WebhookIntegrationsByApp(ctx context.Context, appID string) ([]*model.WebhookIntegration, error)
	WebhookIntegration(ctx context.Context, id string) (*model.WebhookIntegration, error)
	CreateWebhookIntegration(ctx context.Context, integration *model.WebhookIntegration) (*model.WebhookIntegration, error)
	UpdateWebhookIntegration(ctx context.Context, integration *model.WebhookIntegration) (*model.WebhookIntegration, error)
	DeleteWebhookIntegration(ctx context.Context, id string) error
}
