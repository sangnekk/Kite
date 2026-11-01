package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) Settings(ctx context.Context) ([]store.Setting, error) {
	rows, err := c.Q.ListSettings(ctx)
	if err != nil {
		return nil, err
	}

	settings := make([]store.Setting, len(rows))
	for i, row := range rows {
		settings[i] = store.Setting{
			Namespace: row.Namespace,
			Key:       row.Key,
			Value:     row.Value,
			IsSecret:  row.IsSecret,
		}
	}
	return settings, nil
}

func (c *Client) SaveSetting(ctx context.Context, setting store.Setting, updatedBy string) error {
	return c.Q.UpsertSetting(ctx, pgmodel.UpsertSettingParams{
		Namespace: setting.Namespace,
		Key:       setting.Key,
		Value:     setting.Value,
		IsSecret:  setting.IsSecret,
		UpdatedBy: pgtype.Text{String: updatedBy, Valid: updatedBy != ""},
		UpdatedAt: pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
	})
}
