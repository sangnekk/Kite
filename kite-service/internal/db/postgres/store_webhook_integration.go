package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) WebhookIntegrationsByApp(ctx context.Context, appID string) ([]*model.WebhookIntegration, error) {
	rows, err := c.Q.GetWebhookIntegrationsByApp(ctx, appID)
	if err != nil {
		return nil, err
	}

	integrations := make([]*model.WebhookIntegration, len(rows))
	for i, row := range rows {
		integrations[i] = rowToWebhookIntegration(row)
	}
	return integrations, nil
}

func (c *Client) WebhookIntegration(ctx context.Context, id string) (*model.WebhookIntegration, error) {
	row, err := c.Q.GetWebhookIntegration(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	return rowToWebhookIntegration(row), nil
}

func (c *Client) CreateWebhookIntegration(ctx context.Context, integration *model.WebhookIntegration) (*model.WebhookIntegration, error) {
	row, err := c.Q.CreateWebhookIntegration(ctx, pgmodel.CreateWebhookIntegrationParams{
		ID:        integration.ID,
		AppID:     integration.AppID,
		Type:      string(integration.Type),
		Secret:    integration.Secret,
		Enabled:   integration.Enabled,
		CreatedAt: pgtype.Timestamp{Time: integration.CreatedAt.UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamp{Time: integration.UpdatedAt.UTC(), Valid: true},
	})
	if err != nil {
		return nil, err
	}
	return rowToWebhookIntegration(row), nil
}

func (c *Client) UpdateWebhookIntegration(ctx context.Context, integration *model.WebhookIntegration) (*model.WebhookIntegration, error) {
	row, err := c.Q.UpdateWebhookIntegration(ctx, pgmodel.UpdateWebhookIntegrationParams{
		ID:        integration.ID,
		Secret:    integration.Secret,
		Enabled:   integration.Enabled,
		UpdatedAt: pgtype.Timestamp{Time: integration.UpdatedAt.UTC(), Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	return rowToWebhookIntegration(row), nil
}

func (c *Client) DeleteWebhookIntegration(ctx context.Context, id string) error {
	err := c.Q.DeleteWebhookIntegration(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return store.ErrNotFound
		}
		return err
	}
	return nil
}

func rowToWebhookIntegration(row pgmodel.WebhookIntegration) *model.WebhookIntegration {
	return &model.WebhookIntegration{
		ID:        row.ID,
		AppID:     row.AppID,
		Type:      model.WebhookIntegrationType(row.Type),
		Secret:    row.Secret,
		Enabled:   row.Enabled,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}
