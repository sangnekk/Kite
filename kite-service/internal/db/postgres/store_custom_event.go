package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
)

func (c *Client) CustomEventsByApp(ctx context.Context, appID string) ([]*model.CustomEvent, error) {
	rows, err := c.Q.GetCustomEventsByApp(ctx, appID)
	if err != nil {
		return nil, err
	}
	events := make([]*model.CustomEvent, len(rows))
	for i, row := range rows {
		events[i] = rowToCustomEvent(row)
	}
	return events, nil
}

func (c *Client) CountCustomEventsByApp(ctx context.Context, appID string) (int, error) {
	var count int
	err := c.DB.QueryRow(ctx, `SELECT COUNT(*) FROM custom_events WHERE app_id = $1`, appID).Scan(&count)
	return count, err
}

func (c *Client) CustomEvent(ctx context.Context, id string) (*model.CustomEvent, error) {
	row, err := c.Q.GetCustomEvent(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return rowToCustomEvent(row), nil
}

func (c *Client) CreateCustomEvent(ctx context.Context, event *model.CustomEvent) (*model.CustomEvent, error) {
	row, err := c.Q.CreateCustomEvent(ctx, pgmodel.CreateCustomEventParams{
		ID: event.ID, AppID: event.AppID, Name: event.Name, Description: event.Description,
		CreatedAt: pgtype.Timestamp{Time: event.CreatedAt.UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamp{Time: event.UpdatedAt.UTC(), Valid: true},
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, store.ErrAlreadyExists
		}
		return nil, err
	}
	return rowToCustomEvent(row), nil
}

func (c *Client) UpdateCustomEvent(ctx context.Context, event *model.CustomEvent) (*model.CustomEvent, error) {
	row, err := c.Q.UpdateCustomEvent(ctx, pgmodel.UpdateCustomEventParams{
		ID: event.ID, Name: event.Name, Description: event.Description,
		UpdatedAt: pgtype.Timestamp{Time: event.UpdatedAt.UTC(), Valid: true},
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, store.ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, store.ErrAlreadyExists
		}
		return nil, err
	}
	return rowToCustomEvent(row), nil
}

func (c *Client) DeleteCustomEvent(ctx context.Context, id string) error {
	rows, err := c.Q.DeleteCustomEvent(ctx, id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return store.ErrAlreadyExists
		}
		return err
	}
	if rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func rowToCustomEvent(row pgmodel.CustomEvent) *model.CustomEvent {
	return &model.CustomEvent{
		ID: row.ID, AppID: row.AppID, Name: row.Name, Description: row.Description,
		CreatedAt: row.CreatedAt.Time, UpdatedAt: row.UpdatedAt.Time,
	}
}
