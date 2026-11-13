package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCancelPendingPaymentSession(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)

	cleanAdminFixture(t, c)
	t.Cleanup(func() { cleanAdminFixture(t, c) })

	ts := "'" + now.Format("2006-01-02 15:04:05") + "'"
	execAll(t, c,
		`INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at) VALUES
			('itest-cu','itest-cancel@example.com','Cancel','itest-dcu','cancel',`+ts+`,`+ts+`)`,
		`INSERT INTO apps (id,name,enabled,owner_user_id,creator_user_id,discord_token,discord_id,created_at,updated_at) VALUES
			('itest-ca','Cancel bot',true,'itest-cu','itest-cu','TOKEN','itest-dca',`+ts+`,`+ts+`),
			('itest-cb','Other bot',true,'itest-cu','itest-cu','TOKEN','itest-dcb',`+ts+`,`+ts+`)`,
		`INSERT INTO payment_sessions (id,provider,payment_id,app_id,plan_id,amount,qr_image_url,qr_content,status,created_at,updated_at,paid_at) VALUES
			('itest-ps-wait','sepay','itest-pay-wait','itest-ca','pro',39000,'','','pending',`+ts+`,`+ts+`,NULL),
			('itest-ps-paid','sepay','itest-pay-paid','itest-ca','pro',39000,'','','paid',`+ts+`,`+ts+`,`+ts+`),
			('itest-ps-other','sepay','itest-pay-other','itest-cb','pro',39000,'','','pending',`+ts+`,`+ts+`,NULL)`,
	)

	statusOf := func(paymentID string) string {
		var status string
		require.NoError(t, c.DB.QueryRow(ctx, `SELECT status FROM payment_sessions WHERE payment_id = $1`, paymentID).Scan(&status))
		return status
	}

	// a payment of another app is not touched
	done, err := c.CancelPendingPaymentSession(ctx, "itest-ca", "itest-pay-other", now)
	require.NoError(t, err)
	assert.False(t, done)
	assert.Equal(t, "pending", statusOf("itest-pay-other"))

	// a payment already paid is not undone
	done, err = c.CancelPendingPaymentSession(ctx, "itest-ca", "itest-pay-paid", now)
	require.NoError(t, err)
	assert.False(t, done)
	assert.Equal(t, "paid", statusOf("itest-pay-paid"))

	// a pending payment of the app is cancelled, once
	done, err = c.CancelPendingPaymentSession(ctx, "itest-ca", "itest-pay-wait", now)
	require.NoError(t, err)
	assert.True(t, done)
	assert.Equal(t, "failed", statusOf("itest-pay-wait"))

	done, err = c.CancelPendingPaymentSession(ctx, "itest-ca", "itest-pay-wait", now)
	require.NoError(t, err)
	assert.False(t, done, "the second time there is nothing pending left")

	// a payment that does not exist is not an error, just nothing to cancel
	done, err = c.CancelPendingPaymentSession(ctx, "itest-ca", "itest-pay-missing", now)
	require.NoError(t, err)
	assert.False(t, done)
}
