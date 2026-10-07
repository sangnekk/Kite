package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kitecloud/kite/kite-service/internal/model"
)

// app_settings is intentionally not managed by sqlc; it uses raw pgx queries so
// it can be added without regenerating the sqlc models.

const appSettingsColumns = `app_id, enable_prefix_commands, command_prefix, log_component_interactions, updated_at`

func scanAppSettings(row pgx.Row) (*model.AppSettings, error) {
	var s model.AppSettings
	err := row.Scan(&s.AppID, &s.EnablePrefixCommands, &s.CommandPrefix, &s.LogComponentInteractions, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (c *Client) AppSettings(ctx context.Context, appID string) (*model.AppSettings, error) {
	row := c.DB.QueryRow(
		ctx,
		`SELECT `+appSettingsColumns+` FROM app_settings WHERE app_id = $1`,
		appID,
	)

	s, err := scanAppSettings(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// No settings stored yet: return defaults.
			return &model.AppSettings{AppID: appID}, nil
		}
		return nil, err
	}

	return s, nil
}

func (c *Client) UpsertAppSettings(ctx context.Context, settings *model.AppSettings) (*model.AppSettings, error) {
	row := c.DB.QueryRow(
		ctx,
		`INSERT INTO app_settings (app_id, enable_prefix_commands, command_prefix, log_component_interactions, updated_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (app_id) DO UPDATE SET
		     enable_prefix_commands = EXCLUDED.enable_prefix_commands,
		     command_prefix = EXCLUDED.command_prefix,
		     log_component_interactions = EXCLUDED.log_component_interactions,
		     updated_at = EXCLUDED.updated_at
		 RETURNING `+appSettingsColumns,
		settings.AppID,
		settings.EnablePrefixCommands,
		settings.CommandPrefix,
		settings.LogComponentInteractions,
		time.Now().UTC(),
	)

	return scanAppSettings(row)
}
