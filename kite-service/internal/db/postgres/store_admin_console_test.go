package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func execAll(t *testing.T, c *Client, statements ...string) {
	t.Helper()
	for _, s := range statements {
		_, err := c.DB.Exec(context.Background(), s)
		require.NoError(t, err, s)
	}
}

// cleanAdminFixture removes everything seeded by seedAdminFixture.
func cleanAdminFixture(t *testing.T, c *Client) {
	t.Helper()
	execAll(t, c,
		`DELETE FROM logs WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM usage_records WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM resume_points WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM collaborators WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM entitlements WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM payment_sessions WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM subscriptions WHERE user_id LIKE 'itest-%'`,
		`DELETE FROM sessions WHERE user_id LIKE 'itest-%'`,
		`DELETE FROM apps WHERE id LIKE 'itest-%'`,
		`DELETE FROM users WHERE id LIKE 'itest-%'`,
	)
}

func seedAdminFixture(t *testing.T, c *Client, now time.Time) {
	t.Helper()
	cleanAdminFixture(t, c)
	t.Cleanup(func() { cleanAdminFixture(t, c) })

	ts := func(d time.Duration) string { return "'" + now.Add(d).Format("2006-01-02 15:04:05") + "'" }
	nowTS := ts(0)

	execAll(t, c,
		`INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at) VALUES
			('itest-u1','itest-alice@example.com','Alice','itest-d1','alice_under_score',`+nowTS+`,`+nowTS+`),
			('itest-u2','itest-bob@example.com','Bob','itest-d2','bobby',`+ts(-time.Hour)+`,`+nowTS+`)`,
		`INSERT INTO apps (id,name,enabled,disabled_reason,owner_user_id,creator_user_id,discord_token,discord_id,created_at,updated_at) VALUES
			('itest-a1','Alpha bot',true,NULL,'itest-u1','itest-u1','SECRET-TOKEN-1','itest-da1',`+nowTS+`,`+nowTS+`),
			('itest-a2','Beta bot',false,'spam','itest-u1','itest-u1','SECRET-TOKEN-2','itest-da2',`+ts(-time.Minute)+`,`+nowTS+`),
			('itest-a3','Gamma bot',true,NULL,'itest-u2','itest-u2','SECRET-TOKEN-3','itest-da3',`+ts(-2*time.Minute)+`,`+nowTS+`)`,
		`INSERT INTO collaborators (user_id,app_id,role,created_at,updated_at) VALUES ('itest-u2','itest-a1','editor',`+nowTS+`,`+nowTS+`)`,
		`INSERT INTO usage_records (type,app_id,credits_used,created_at) VALUES
			('command','itest-a1',10,`+nowTS+`),('command','itest-a1',5,`+nowTS+`),('command','itest-a1',100,`+ts(-10*24*time.Hour)+`)`,
		`INSERT INTO logs (app_id,message,level,created_at) VALUES
			('itest-a1','boom 100% failed','error',`+nowTS+`),
			('itest-a1','boom again','error',`+nowTS+`),
			('itest-a1','all fine','info',`+nowTS+`),
			('itest-a1','old boom','error',`+ts(-30*time.Hour)+`),
			('itest-a2','careful','warn',`+nowTS+`)`,
		`INSERT INTO subscriptions (id,display_name,source,status,status_formatted,created_at,updated_at,renews_at,user_id) VALUES
			('itest-s1','Pro','sepay','active','Active',`+nowTS+`,`+nowTS+`,`+ts(24*time.Hour)+`,'itest-u1'),
			('itest-s2','Max','sepay','cancelled','Cancelled',`+ts(-time.Hour)+`,`+nowTS+`,`+ts(24*time.Hour)+`,'itest-u2')`,
		`INSERT INTO entitlements (id,type,subscription_id,app_id,plan_id,created_at,updated_at,ends_at) VALUES
			('itest-e1','subscription','itest-s1','itest-a1','pro',`+nowTS+`,`+nowTS+`,NULL)`,
		`INSERT INTO payment_sessions (id,provider,payment_id,app_id,plan_id,amount,qr_image_url,qr_content,status,created_at,updated_at,paid_at) VALUES
			('itest-p1','sepay','itest-pay1','itest-a1','pro',39000,'','','pending',`+nowTS+`,`+nowTS+`,NULL),
			('itest-p2','sepay','itest-pay2','itest-a1','pro',39000,'','','paid',`+ts(-time.Minute)+`,`+nowTS+`,`+nowTS+`),
			('itest-p3','sepay','itest-pay3','itest-a3','student',19000,'','','paid',`+ts(-60*24*time.Hour)+`,`+nowTS+`,`+ts(-60*24*time.Hour)+`)`,
		`INSERT INTO sessions (key_hash,user_id,created_at,expires_at) VALUES
			('itest-k1','itest-u1',`+nowTS+`,`+ts(time.Hour)+`),('itest-k2','itest-u1',`+nowTS+`,`+ts(time.Hour)+`)`,
		`INSERT INTO resume_points (id,type,app_id,flow_node_id,flow_state,created_at) VALUES
			('itest-r1','component','itest-a1','n1','{}',`+nowTS+`),('itest-r2','component','itest-a1','n2','{}',`+nowTS+`)`,
	)
}

func TestAdminConsoleUsers(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)
	seedAdminFixture(t, c, now)

	users, total, err := c.AdminListUsers(ctx, "itest-", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, users, 2)
	assert.Equal(t, "itest-u1", users[0].ID, "newest first")
	assert.Equal(t, 2, users[0].AppsCount)
	assert.Equal(t, "Pro", users[0].Plan)
	assert.Equal(t, "free", users[1].Plan, "a cancelled subscription is not a plan")

	// Pagination.
	page2, total, err := c.AdminListUsers(ctx, "itest-", store.Page{Number: 2, Size: 1})
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, page2, 1)
	assert.Equal(t, "itest-u2", page2[0].ID)

	// Search matches by Discord username, and LIKE wildcards are literal.
	found, _, err := c.AdminListUsers(ctx, "alice_under", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	require.Len(t, found, 1)
	assert.Equal(t, "itest-u1", found[0].ID)

	for _, wildcard := range []string{"a_ice", "%", "alice%score", `\`} {
		none, n, err := c.AdminListUsers(ctx, wildcard, store.Page{Number: 1, Size: 10})
		require.NoError(t, err, wildcard)
		assert.Zero(t, n, "search %q must not behave like a wildcard", wildcard)
		assert.Empty(t, none)
	}

	detail, err := c.AdminUserByID(ctx, "itest-u1")
	require.NoError(t, err)
	assert.Len(t, detail.Apps, 2)
	require.NotNil(t, detail.Subscription)
	assert.Equal(t, "Pro", detail.Subscription.DisplayName)

	bob, err := c.AdminUserByID(ctx, "itest-u2")
	require.NoError(t, err)
	assert.Nil(t, bob.Subscription)

	_, err = c.AdminUserByID(ctx, "itest-missing")
	assert.ErrorIs(t, err, store.ErrNotFound)

	removed, err := c.AdminDeleteUserSessions(ctx, "itest-u1")
	require.NoError(t, err)
	assert.EqualValues(t, 2, removed)
}

func TestAdminConsoleApps(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)
	seedAdminFixture(t, c, now)

	apps, total, err := c.AdminListApps(ctx, "bot", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, 3)

	byID := map[string]store.AdminAppSummary{}
	for _, a := range apps {
		byID[a.ID] = a
	}
	require.Contains(t, byID, "itest-a1")
	a1 := byID["itest-a1"]
	assert.EqualValues(t, 115, a1.CreditsUsed)
	assert.Equal(t, 1, a1.CollaboratorsCount)
	require.NotNil(t, a1.OwnerEmail)
	assert.Equal(t, "itest-alice@example.com", *a1.OwnerEmail)
	assert.False(t, byID["itest-a2"].Enabled)
	require.NotNil(t, byID["itest-a2"].DisabledReason)
	assert.Equal(t, "spam", *byID["itest-a2"].DisabledReason)

	detail, err := c.AdminApp(ctx, "itest-a1")
	require.NoError(t, err)
	assert.Equal(t, 2, detail.ResumePointsCount)
	assert.EqualValues(t, 115, detail.CreditsUsed)
	assert.Equal(t, []store.AdminCollaborator{{UserID: "itest-u2", Role: "editor"}}, detail.Collaborators)

	_, err = c.AdminApp(ctx, "itest-missing")
	assert.ErrorIs(t, err, store.ErrNotFound)

	// Disabling bumps updated_at (that is what makes the gateways pick it up).
	before := detail.UpdatedAt
	reason := "abuse"
	require.NoError(t, c.AdminSetAppEnabled(ctx, "itest-a1", false, &reason, now.Add(time.Minute)))
	disabled, err := c.AdminApp(ctx, "itest-a1")
	require.NoError(t, err)
	assert.False(t, disabled.Enabled)
	require.NotNil(t, disabled.DisabledReason)
	assert.Equal(t, "abuse", *disabled.DisabledReason)
	assert.True(t, disabled.UpdatedAt.After(before))

	require.NoError(t, c.AdminSetAppEnabled(ctx, "itest-a1", true, nil, now.Add(2*time.Minute)))
	enabled, err := c.AdminApp(ctx, "itest-a1")
	require.NoError(t, err)
	assert.True(t, enabled.Enabled)
	assert.Nil(t, enabled.DisabledReason)

	assert.ErrorIs(t, c.AdminSetAppEnabled(ctx, "itest-missing", true, nil, now), store.ErrNotFound)

	deleted, err := c.AdminDeleteResumePoints(ctx, "itest-a1")
	require.NoError(t, err)
	assert.EqualValues(t, 2, deleted)
}

func TestAdminConsoleBilling(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)
	seedAdminFixture(t, c, now)

	subs, total, err := c.AdminListSubscriptions(ctx, "itest-alice", "", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 1, total, "search is applied before paging, so the total is right")
	require.Len(t, subs, 1)
	assert.Equal(t, "itest-s1", subs[0].ID)
	require.NotNil(t, subs[0].UserEmail)

	cancelled, total, err := c.AdminListSubscriptions(ctx, "itest-", "cancelled", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Equal(t, "itest-s2", cancelled[0].ID)

	// Cancelling ends the subscription AND the entitlement it granted.
	require.NoError(t, c.AdminSetSubscriptionStatus(ctx, "itest-s1", "cancelled", now))
	subs, _, err = c.AdminListSubscriptions(ctx, "itest-alice", "", store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, "cancelled", subs[0].Status)
	require.NotNil(t, subs[0].EndsAt)

	var endsAt *time.Time
	require.NoError(t, c.DB.QueryRow(ctx, `SELECT ends_at FROM entitlements WHERE id = 'itest-e1'`).Scan(&endsAt))
	require.NotNil(t, endsAt, "the entitlement of a cancelled subscription must end")
	assert.WithinDuration(t, now, *endsAt, time.Second)

	var formatted string
	require.NoError(t, c.DB.QueryRow(ctx, `SELECT status_formatted FROM subscriptions WHERE id = 'itest-s1'`).Scan(&formatted))
	assert.Equal(t, "Cancelled", formatted)

	assert.ErrorIs(t, c.AdminSetSubscriptionStatus(ctx, "itest-missing", "cancelled", now), store.ErrNotFound)

	// Manual entitlements.
	until := now.Add(48 * time.Hour)
	require.NoError(t, c.AdminCreateManualEntitlement(ctx, "itest-e2", "itest-a3", "max", now, &until))
	require.NoError(t, c.AdminCreateManualEntitlement(ctx, "itest-e3", "itest-a3", "pro", now, nil))
	ents, _, err := c.AdminListEntitlements(ctx, store.Page{Number: 1, Size: 100})
	require.NoError(t, err)
	byID := map[string]store.AdminEntitlement{}
	for _, e := range ents {
		byID[e.ID] = e
	}
	require.Contains(t, byID, "itest-e2")
	assert.Equal(t, "manual", byID["itest-e2"].Type)
	assert.Nil(t, byID["itest-e2"].SubscriptionID)
	require.NotNil(t, byID["itest-e2"].AppName)
	assert.Equal(t, "Gamma bot", *byID["itest-e2"].AppName)
	assert.NotNil(t, byID["itest-e2"].EndsAt)
	assert.Nil(t, byID["itest-e3"].EndsAt, "no end date means permanent")

	require.NoError(t, c.AdminDeleteEntitlement(ctx, "itest-e2"))
	assert.ErrorIs(t, c.AdminDeleteEntitlement(ctx, "itest-e2"), store.ErrNotFound)

	// Payment sessions.
	pending, total, err := c.AdminListPaymentSessions(ctx, "pending", store.Page{Number: 1, Size: 100})
	require.NoError(t, err)
	assert.GreaterOrEqual(t, total, 1)
	var pendingMine []string
	for _, p := range pending {
		if p.AppID == "itest-a1" {
			pendingMine = append(pendingMine, p.ID)
			require.NotNil(t, p.AppName)
			assert.Equal(t, "Alpha bot", *p.AppName)
		}
	}
	assert.Equal(t, []string{"itest-p1"}, pendingMine)

	paymentID, err := c.AdminPaymentSessionPaymentID(ctx, "itest-p1")
	require.NoError(t, err)
	assert.Equal(t, "itest-pay1", paymentID)
	_, err = c.AdminPaymentSessionPaymentID(ctx, "itest-missing")
	assert.ErrorIs(t, err, store.ErrNotFound)

	require.NoError(t, c.AdminCancelPendingPaymentSession(ctx, "itest-p1", "failed", now))
	assert.ErrorIs(t, c.AdminCancelPendingPaymentSession(ctx, "itest-p1", "failed", now), store.ErrNotFound, "no longer pending")
	assert.ErrorIs(t, c.AdminCancelPendingPaymentSession(ctx, "itest-p2", "failed", now), store.ErrNotFound, "a paid session must never be cancelled")
}

func TestAdminConsoleLogsDashboardRevenue(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Second)

	// Aggregates cover the whole database, so compare against a baseline.
	baseDash, err := c.AdminDashboard(ctx, now)
	require.NoError(t, err)
	baseRev, err := c.AdminRevenueTotals(ctx, now.Add(-time.Hour), now.Add(time.Hour))
	require.NoError(t, err)
	baseCounts, err := c.AdminSubscriptionCounts(ctx)
	require.NoError(t, err)

	seedAdminFixture(t, c, now)

	// Logs.
	errorsOfA1, total, err := c.AdminListLogs(ctx, store.AdminLogFilter{Level: "error", AppID: "itest-a1"}, store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 3, total)
	require.Len(t, errorsOfA1, 3)
	assert.Equal(t, "old boom", errorsOfA1[2].Message, "newest first")
	require.NotNil(t, errorsOfA1[0].AppName)
	assert.Equal(t, "Alpha bot", *errorsOfA1[0].AppName)

	_, total, err = c.AdminListLogs(ctx, store.AdminLogFilter{AppID: "itest-a1", Search: "100%"}, store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 1, total, "a literal percent sign is searchable")
	_, total, err = c.AdminListLogs(ctx, store.AdminLogFilter{AppID: "itest-a1", Search: "%"}, store.Page{Number: 1, Size: 10})
	require.NoError(t, err)
	assert.Equal(t, 1, total, "and does not match everything")
	_, total, err = c.AdminListLogs(ctx, store.AdminLogFilter{AppID: "itest-a1"}, store.Page{Number: 1, Size: 2})
	require.NoError(t, err)
	assert.Equal(t, 4, total)

	options, err := c.AdminLogApps(ctx)
	require.NoError(t, err)
	var optionIDs []string
	for _, o := range options {
		optionIDs = append(optionIDs, o.ID)
	}
	assert.Contains(t, optionIDs, "itest-a1")

	// Dashboard.
	dash, err := c.AdminDashboard(ctx, now)
	require.NoError(t, err)
	assert.EqualValues(t, 2, dash.Stats.TotalUsers-baseDash.Stats.TotalUsers)
	assert.EqualValues(t, 3, dash.Stats.TotalApps-baseDash.Stats.TotalApps)
	assert.EqualValues(t, 2, dash.Stats.ActiveApps-baseDash.Stats.ActiveApps)
	assert.EqualValues(t, 2, dash.Stats.Errors24h-baseDash.Stats.Errors24h)
	assert.EqualValues(t, 1, dash.Stats.ErrorsPrev24h-baseDash.Stats.ErrorsPrev24h)
	assert.EqualValues(t, 115, dash.Stats.TotalCredits-baseDash.Stats.TotalCredits)
	assert.EqualValues(t, 1, dash.Stats.ActiveSubscriptions-baseDash.Stats.ActiveSubscriptions)

	require.Len(t, dash.Days, 7)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	assert.Equal(t, today, dash.Days[6].Day)
	assert.Equal(t, today.AddDate(0, 0, -6), dash.Days[0].Day)
	assert.EqualValues(t, 15, dash.Days[6].Credits-baseDash.Days[6].Credits)
	assert.EqualValues(t, 2, dash.Days[6].Errors-baseDash.Days[6].Errors)
	assert.NotEmpty(t, dash.RecentLogs)
	assert.LessOrEqual(t, len(dash.RecentLogs), 10)

	// Revenue: only paid sessions count, inside the window.
	rev, err := c.AdminRevenueTotals(ctx, now.Add(-time.Hour), now.Add(time.Hour))
	require.NoError(t, err)
	assert.EqualValues(t, 39000, rev.Total-baseRev.Total)
	assert.EqualValues(t, 1, rev.Count-baseRev.Count)

	for _, unit := range []string{"hour", "day"} {
		points, err := c.AdminRevenueChart(ctx, unit, now.Add(-24*time.Hour))
		require.NoError(t, err, unit)
		var sum int64
		for _, p := range points {
			sum += p.Total
		}
		assert.GreaterOrEqual(t, sum, int64(39000), unit)
	}

	counts, err := c.AdminSubscriptionCounts(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 1, counts["active"]-baseCounts["active"])
	assert.EqualValues(t, 1, counts["cancelled"]-baseCounts["cancelled"])
}
