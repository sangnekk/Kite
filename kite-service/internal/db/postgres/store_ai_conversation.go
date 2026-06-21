package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) AIConversationsByContext(ctx context.Context, appID, contextKey string) ([]*model.AIConversationSummary, error) {
	rows, err := c.DB.Query(ctx,
		`SELECT id, title, updated_at FROM ai_conversations
		 WHERE app_id = $1 AND context_key = $2
		 ORDER BY updated_at DESC`,
		appID, contextKey,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []*model.AIConversationSummary
	for rows.Next() {
		var s model.AIConversationSummary
		if err := rows.Scan(&s.ID, &s.Title, &s.UpdatedAt); err != nil {
			return nil, err
		}
		res = append(res, &s)
	}
	return res, rows.Err()
}

func (c *Client) AIConversation(ctx context.Context, appID, id string) (*model.AIConversation, error) {
	var conv model.AIConversation
	err := c.DB.QueryRow(ctx,
		`SELECT id, app_id, context_key, title, messages, created_at, updated_at
		 FROM ai_conversations WHERE app_id = $1 AND id = $2`,
		appID, id,
	).Scan(
		&conv.ID, &conv.AppID, &conv.ContextKey, &conv.Title,
		&conv.Messages, &conv.CreatedAt, &conv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	return &conv, nil
}

func (c *Client) UpsertAIConversation(ctx context.Context, conv *model.AIConversation) error {
	now := time.Now().UTC()
	_, err := c.DB.Exec(ctx, `
INSERT INTO ai_conversations (id, app_id, context_key, title, messages, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $6)
ON CONFLICT (id)
DO UPDATE SET title = EXCLUDED.title, messages = EXCLUDED.messages, updated_at = EXCLUDED.updated_at
`, conv.ID, conv.AppID, conv.ContextKey, conv.Title, conv.Messages, now)
	return err
}

func (c *Client) DeleteAIConversation(ctx context.Context, appID, id string) error {
	_, err := c.DB.Exec(ctx,
		`DELETE FROM ai_conversations WHERE app_id = $1 AND id = $2`,
		appID, id,
	)
	return err
}
