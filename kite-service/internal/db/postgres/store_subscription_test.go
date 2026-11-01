package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/guregu/null.v4"
)

func TestUpsertSubscriptionIsIdempotentPerPayment(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()

	cleanup := func() {
		execAll(t, c,
			`DELETE FROM subscriptions WHERE user_id = 'itest-sub-user'`,
			`DELETE FROM users WHERE id = 'itest-sub-user'`,
		)
	}
	cleanup()
	t.Cleanup(cleanup)
	execAll(t, c, `INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at)
		VALUES ('itest-sub-user','itest-sub@example.com','Sub','itest-sub-d','sub',now(),now())`)

	now := time.Now().UTC().Truncate(time.Second)
	sub := func(id, reference, plan string) model.Subscription {
		return model.Subscription{
			ID: id, DisplayName: "Pro", Source: model.SubscriptionSourceSePay, Status: "active",
			StatusFormatted: "Active", RenewsAt: now.Add(24 * time.Hour), CreatedAt: now, UpdatedAt: now,
			UserID:           "itest-sub-user",
			PaymentID:        null.StringFrom("KITE-itest-1"),
			PaymentReference: null.StringFrom(reference),
			PlanID:           null.StringFrom(plan),
		}
	}

	first, err := c.UpsertSubscription(ctx, sub("itest-sub-a", "REF-1", "pro"))
	require.NoError(t, err)
	assert.Equal(t, "itest-sub-a", first.ID)
	assert.Equal(t, "KITE-itest-1", first.PaymentID.String)
	assert.Equal(t, "REF-1", first.PaymentReference.String)
	assert.Equal(t, "pro", first.PlanID.String)

	// The same payment again (a retried notification) updates the row, it never
	// creates a second subscription and keeps the id of the first one.
	second, err := c.UpsertSubscription(ctx, sub("itest-sub-b", "REF-2", "max"))
	require.NoError(t, err)
	assert.Equal(t, "itest-sub-a", second.ID)
	assert.Equal(t, "REF-2", second.PaymentReference.String)
	assert.Equal(t, "max", second.PlanID.String)

	var count int
	require.NoError(t, c.DB.QueryRow(ctx, `SELECT count(*) FROM subscriptions WHERE user_id = 'itest-sub-user'`).Scan(&count))
	assert.Equal(t, 1, count)

	// A different payment is a different subscription.
	other := sub("itest-sub-c", "REF-3", "pro")
	other.PaymentID = null.StringFrom("KITE-itest-2")
	_, err = c.UpsertSubscription(ctx, other)
	require.NoError(t, err)
	require.NoError(t, c.DB.QueryRow(ctx, `SELECT count(*) FROM subscriptions WHERE user_id = 'itest-sub-user'`).Scan(&count))
	assert.Equal(t, 2, count)

	list, err := c.Subscriptions(ctx, "itest-sub-user")
	require.NoError(t, err)
	assert.Len(t, list, 2)
}
