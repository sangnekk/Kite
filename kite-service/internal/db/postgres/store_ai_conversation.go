package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) AIConversationMessages(ctx context.Context, appID, contextKey string) ([]byte, error) {
	var messages []byte
	err := c.DB.QueryRow(ctx,
		`SELECT messages FROM ai_conversations WHERE app_id = $1 AND context_key = $2`,
		appID, contextKey,
	).Scan(&messages)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	return messages, nil
}

func (c *Client) UpsertAIConversation(ctx context.Context, appID, contextKey string, messages []byte) error {
	now := time.Now().UTC()
	_, err := c.DB.Exec(ctx, `
INSERT INTO ai_conversations (app_id, context_key, messages, created_at, updated_at)
VALUES ($1, $2, $3, $4, $4)
ON CONFLICT (app_id, context_key)
DO UPDATE SET messages = EXCLUDED.messages, updated_at = EXCLUDED.updated_at
`, appID, contextKey, messages, now)
	return err
}

func (c *Client) DeleteAIConversation(ctx context.Context, appID, contextKey string) error {
	_, err := c.DB.Exec(ctx,
		`DELETE FROM ai_conversations WHERE app_id = $1 AND context_key = $2`,
		appID, contextKey,
	)
	return err
}
