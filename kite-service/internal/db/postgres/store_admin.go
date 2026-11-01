package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) AdminUsers(ctx context.Context) ([]store.AdminUser, error) {
	rows, err := c.Q.ListAdminUsers(ctx)
	if err != nil {
		return nil, err
	}

	users := make([]store.AdminUser, len(rows))
	for i, row := range rows {
		users[i] = rowToAdminUser(row)
	}
	return users, nil
}

func (c *Client) AdminUser(ctx context.Context, discordID string) (*store.AdminUser, error) {
	row, err := c.Q.GetAdminUser(ctx, discordID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	user := rowToAdminUser(row)
	return &user, nil
}

func (c *Client) SaveAdminUser(ctx context.Context, user store.AdminUser) error {
	return c.Q.UpsertAdminUser(ctx, pgmodel.UpsertAdminUserParams{
		DiscordID: user.DiscordID,
		Role:      string(user.Role),
		AddedBy:   user.AddedBy,
	})
}

func (c *Client) DeleteAdminUser(ctx context.Context, discordID string) error {
	return c.Q.DeleteAdminUser(ctx, discordID)
}

func (c *Client) AddAdminAudit(ctx context.Context, entry store.AdminAuditEntry) error {
	return c.Q.CreateAdminAuditLog(ctx, pgmodel.CreateAdminAuditLogParams{
		ActorDiscordID: entry.ActorDiscordID,
		Action:         entry.Action,
		Target:         entry.Target,
		Detail:         entry.Detail,
	})
}

func (c *Client) AdminAuditLog(ctx context.Context, limit, offset int) ([]store.AdminAuditEntry, error) {
	rows, err := c.Q.ListAdminAuditLog(ctx, pgmodel.ListAdminAuditLogParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, err
	}

	entries := make([]store.AdminAuditEntry, len(rows))
	for i, row := range rows {
		entries[i] = store.AdminAuditEntry{
			ID:             row.ID,
			ActorDiscordID: row.ActorDiscordID,
			Action:         row.Action,
			Target:         row.Target,
			Detail:         row.Detail,
			CreatedAt:      row.CreatedAt.Time,
		}
	}
	return entries, nil
}

func rowToAdminUser(row pgmodel.AdminUser) store.AdminUser {
	return store.AdminUser{
		DiscordID: row.DiscordID,
		Role:      store.AdminRole(row.Role),
		AddedBy:   row.AddedBy,
		CreatedAt: row.CreatedAt.Time,
	}
}
