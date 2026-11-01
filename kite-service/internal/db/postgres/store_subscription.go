package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres/pgmodel"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"gopkg.in/guregu/null.v4"
)

func (c *Client) Subscriptions(ctx context.Context, userID string) ([]*model.Subscription, error) {
	rows, err := c.Q.GetSubscriptions(ctx, userID)
	if err != nil {
		return nil, err
	}

	subs := make([]*model.Subscription, 0, len(rows))
	for _, row := range rows {
		subs = append(subs, rowToSubscription(row))
	}

	return subs, nil
}

func (c *Client) SubscriptionsByAppID(ctx context.Context, appID string) ([]*model.Subscription, error) {
	rows, err := c.Q.GetSubscriptionsByAppID(ctx, appID)
	if err != nil {
		return nil, err
	}

	subs := make([]*model.Subscription, 0, len(rows))
	for _, row := range rows {
		subs = append(subs, rowToSubscription(row))
	}

	return subs, nil
}

func (c *Client) AllSubscriptions(ctx context.Context) ([]*model.Subscription, error) {
	rows, err := c.Q.GetAllSubscriptions(ctx)
	if err != nil {
		return nil, err
	}

	subs := make([]*model.Subscription, 0, len(rows))
	for _, row := range rows {
		subs = append(subs, rowToSubscription(row))
	}

	return subs, nil
}

func (c *Client) Subscription(ctx context.Context, subscriptionID string) (*model.Subscription, error) {
	row, err := c.Q.GetSubscription(ctx, subscriptionID)
	if err != nil {
		return nil, err
	}

	return rowToSubscription(row), nil
}

func (c *Client) UpsertSubscription(ctx context.Context, sub model.Subscription) (*model.Subscription, error) {
	row, err := c.Q.UpsertSubscription(ctx, pgmodel.UpsertSubscriptionParams{
		ID:                         sub.ID,
		DisplayName:                sub.DisplayName,
		Source:                     string(sub.Source),
		Status:                     sub.Status,
		StatusFormatted:            sub.StatusFormatted,
		RenewsAt:                   pgtype.Timestamp{Time: sub.RenewsAt, Valid: true},
		TrialEndsAt:                pgtype.Timestamp{Time: sub.TrialEndsAt.Time, Valid: sub.TrialEndsAt.Valid},
		EndsAt:                     pgtype.Timestamp{Time: sub.EndsAt.Time, Valid: sub.EndsAt.Valid},
		CreatedAt:                  pgtype.Timestamp{Time: sub.CreatedAt, Valid: true},
		UpdatedAt:                  pgtype.Timestamp{Time: sub.UpdatedAt, Valid: true},
		UserID:                     sub.UserID,
		PaymentID:                  pgtype.Text{String: sub.PaymentID.String, Valid: sub.PaymentID.Valid},
		PaymentReference:           pgtype.Text{String: sub.PaymentReference.String, Valid: sub.PaymentReference.Valid},
		PlanID:                     pgtype.Text{String: sub.PlanID.String, Valid: sub.PlanID.Valid},
	})
	if err != nil {
		return nil, err
	}

	return rowToSubscription(row), nil
}

func rowToSubscription(row pgmodel.Subscription) *model.Subscription {
	if row.ID == "" {
		return nil
	}

	return &model.Subscription{
		ID:                         row.ID,
		DisplayName:                row.DisplayName,
		Source:                     model.SubscriptionSource(row.Source),
		Status:                     row.Status,
		StatusFormatted:            row.StatusFormatted,
		RenewsAt:                   row.RenewsAt.Time,
		TrialEndsAt:                null.NewTime(row.TrialEndsAt.Time, row.TrialEndsAt.Valid),
		EndsAt:                     null.NewTime(row.EndsAt.Time, row.EndsAt.Valid),
		CreatedAt:                  row.CreatedAt.Time,
		UpdatedAt:                  row.UpdatedAt.Time,
		UserID:                     row.UserID,
		PaymentID:                  null.NewString(row.PaymentID.String, row.PaymentID.Valid),
		PaymentReference:           null.NewString(row.PaymentReference.String, row.PaymentReference.Valid),
		PlanID:                     null.NewString(row.PlanID.String, row.PlanID.Valid),
	}
}
