package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The stored status of a subscription never changes by itself, so a plan whose
// time has run out still says "active" in the row. The admin console shows what
// is true (the plan ended), the same as the entitlement does for the features.
func TestAdminSubscriptionsShowALapsedPlanAsExpired(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)

	cleanAdminFixture(t, c)
	t.Cleanup(func() { cleanAdminFixture(t, c) })

	ts := func(d time.Duration) string { return "'" + now.Add(d).Format("2006-01-02 15:04:05") + "'" }

	baseDash, err := c.AdminDashboard(ctx, now)
	require.NoError(t, err)
	baseCounts, err := c.AdminSubscriptionCounts(ctx)
	require.NoError(t, err)

	execAll(t, c,
		`INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at) VALUES
			('itest-lapsed','itest-lapsed@example.com','Lapsed','itest-dl','lapsed',`+ts(0)+`,`+ts(0)+`),
			('itest-running','itest-running@example.com','Running','itest-dr','running',`+ts(0)+`,`+ts(0)+`),
			('itest-forever','itest-forever@example.com','Forever','itest-df','forever',`+ts(0)+`,`+ts(0)+`),
			('itest-stopped','itest-stopped@example.com','Stopped','itest-ds','stopped',`+ts(0)+`,`+ts(0)+`)`,
		`INSERT INTO subscriptions (id,display_name,source,status,status_formatted,created_at,updated_at,renews_at,ends_at,user_id) VALUES
			('itest-lapsed','Student','sepay','active','Active',`+ts(-40*24*time.Hour)+`,`+ts(-40*24*time.Hour)+`,`+ts(-10*24*time.Hour)+`,`+ts(-10*24*time.Hour)+`,'itest-lapsed'),
			('itest-running','Pro','sepay','active','Active',`+ts(-time.Hour)+`,`+ts(-time.Hour)+`,`+ts(30*24*time.Hour)+`,`+ts(30*24*time.Hour)+`,'itest-running'),
			('itest-forever','Max','sepay','active','Active',`+ts(-time.Hour)+`,`+ts(-time.Hour)+`,`+ts(50*365*24*time.Hour)+`,NULL,'itest-forever'),
			('itest-stopped','Plus','sepay','cancelled','Cancelled',`+ts(-time.Hour)+`,`+ts(-time.Hour)+`,`+ts(30*24*time.Hour)+`,`+ts(-time.Minute)+`,'itest-stopped')`,
	)

	statusOf := func(filter string) map[string]string {
		subs, _, err := c.AdminListSubscriptions(ctx, "itest-", filter, store.Page{Number: 1, Size: 20})
		require.NoError(t, err)
		got := map[string]string{}
		for _, s := range subs {
			got[s.ID] = s.Status
		}
		return got
	}

	// The list tells the truth about each row.
	assert.Equal(t, map[string]string{
		"itest-lapsed":  "expired",
		"itest-running": "active",
		"itest-forever": "active",
		"itest-stopped": "cancelled",
	}, statusOf(""))

	// And so do the filters and their totals: "active" no longer holds the lapsed
	// one, "expired" finds it.
	assert.Equal(t, map[string]string{"itest-running": "active", "itest-forever": "active"}, statusOf("active"))
	assert.Equal(t, map[string]string{"itest-lapsed": "expired"}, statusOf("expired"))
	assert.Equal(t, map[string]string{"itest-stopped": "cancelled"}, statusOf("cancelled"))

	_, total, err := c.AdminListSubscriptions(ctx, "itest-", "expired", store.Page{Number: 1, Size: 20})
	require.NoError(t, err)
	assert.Equal(t, 1, total)

	// A user whose plan ran out has no current plan; one with a running plan does.
	lapsed, err := c.AdminUserByID(ctx, "itest-lapsed")
	require.NoError(t, err)
	assert.Nil(t, lapsed.Subscription)
	assert.Equal(t, "free", lapsed.Plan)

	running, err := c.AdminUserByID(ctx, "itest-running")
	require.NoError(t, err)
	require.NotNil(t, running.Subscription)
	assert.Equal(t, "Pro", running.Subscription.DisplayName)

	forever, err := c.AdminUserByID(ctx, "itest-forever")
	require.NoError(t, err)
	require.NotNil(t, forever.Subscription, "a plan with no end date is still current")

	// The dashboard and the breakdown count current plans only.
	dash, err := c.AdminDashboard(ctx, now)
	require.NoError(t, err)
	assert.EqualValues(t, 2, dash.Stats.ActiveSubscriptions-baseDash.Stats.ActiveSubscriptions)

	counts, err := c.AdminSubscriptionCounts(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 2, counts["active"]-baseCounts["active"])
	assert.EqualValues(t, 1, counts["expired"]-baseCounts["expired"])
	assert.EqualValues(t, 1, counts["cancelled"]-baseCounts["cancelled"])
}
