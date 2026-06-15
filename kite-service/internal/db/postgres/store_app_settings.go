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

func (c *Client) AppSettings(ctx context.Context, appID string) (*model.AppSettings, error) {
	row := c.DB.QueryRow(
		ctx,
		`SELECT app_id, enable_prefix_commands, command_prefix, updated_at
		 FROM app_settings WHERE app_id = $1`,
		appID,
	)

	var s model.AppSettings
	err := row.Scan(&s.AppID, &s.EnablePrefixCommands, &s.CommandPrefix, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// No settings stored yet: return defaults.
			return &model.AppSettings{AppID: appID}, nil
		}
		return nil, err
	}

	return &s, nil
}

func (c *Client) UpsertAppSettings(ctx context.Context, settings *model.AppSettings) (*model.AppSettings, error) {
	row := c.DB.QueryRow(
		ctx,
		`INSERT INTO app_settings (app_id, enable_prefix_commands, command_prefix, updated_at)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (app_id) DO UPDATE SET
		     enable_prefix_commands = EXCLUDED.enable_prefix_commands,
		     command_prefix = EXCLUDED.command_prefix,
		     updated_at = EXCLUDED.updated_at
		 RETURNING app_id, enable_prefix_commands, command_prefix, updated_at`,
		settings.AppID,
		settings.EnablePrefixCommands,
		settings.CommandPrefix,
		time.Now().UTC(),
	)

	var s model.AppSettings
	if err := row.Scan(&s.AppID, &s.EnablePrefixCommands, &s.CommandPrefix, &s.UpdatedAt); err != nil {
		return nil, err
	}

	return &s, nil
}
