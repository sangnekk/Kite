package postgres

import (
	"context"
	"os"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient connects to KITE_TEST_POSTGRES_DSN (a database with all
// migrations applied) and skips the test when it is not configured.
func newTestClient(t *testing.T) *Client {
	t.Helper()
	dsn := os.Getenv("KITE_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("KITE_TEST_POSTGRES_DSN not set")
	}
	c, err := New(dsn, 1)
	require.NoError(t, err)
	t.Cleanup(c.DB.Close)
	return c
}

func TestSavePlanKeepsASingleDefault(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	t.Cleanup(func() { _, _ = c.DB.Exec(ctx, "DELETE FROM plans WHERE id LIKE 'itest-%'") })

	require.NoError(t, c.SavePlan(ctx, model.PlanRecord{Plan: model.Plan{ID: "itest-a", Title: "A", Default: true}}))
	require.NoError(t, c.SavePlan(ctx, model.PlanRecord{Plan: model.Plan{ID: "itest-b", Title: "B", Default: true}}))

	plans, err := c.Plans(ctx)
	require.NoError(t, err)

	defaults := map[string]bool{}
	for _, p := range plans {
		if p.ID == "itest-a" || p.ID == "itest-b" {
			defaults[p.ID] = p.Default
		}
	}
	assert.Equal(t, map[string]bool{"itest-a": false, "itest-b": true}, defaults)
}

func TestSavePlanRoundTripsEveryField(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	t.Cleanup(func() { _, _ = c.DB.Exec(ctx, "DELETE FROM plans WHERE id = 'itest-full'") })

	want := model.PlanRecord{
		Plan: model.Plan{
			ID: "itest-full", Title: "Full", Description: "d", Price: 39000, PaymentAmount: 39000,
			PremiumDurationDays: 30, Popular: true, Hidden: true, DiscordRoleID: "role",
			FeatureMaxCollaborators: 5, FeatureUsageCreditsPerMonth: 39000, FeatureMaxGuilds: 250,
			FeatureMaxCommands: 80, FeatureMaxVariables: 100, FeatureMaxCustomTables: -1,
			FeatureMaxCustomEvents: 50, FeatureMaxMessages: 80, FeatureMaxEventListeners: 25,
			FeatureMaxSchedules: -1, FeaturePrioritySupport: true, FeatureCustomBotStatus: true,
			FeatureAIIncluded: true, FeatureAICreditPerDay: 250,
		},
		Archived: true, SortOrder: 42,
	}
	require.NoError(t, c.SavePlan(ctx, want))

	plans, err := c.Plans(ctx)
	require.NoError(t, err)
	for _, p := range plans {
		if p.ID == "itest-full" {
			assert.Equal(t, want, p)
			return
		}
	}
	t.Fatal("saved plan not found")
}

func TestAdminUserCRUDAndAudit(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	t.Cleanup(func() {
		_, _ = c.DB.Exec(ctx, "DELETE FROM admin_users WHERE discord_id LIKE 'itest-%'")
		_, _ = c.DB.Exec(ctx, "DELETE FROM admin_audit_log WHERE actor_discord_id LIKE 'itest-%'")
	})

	got, err := c.AdminUser(ctx, "itest-1")
	require.NoError(t, err)
	assert.Nil(t, got)

	require.NoError(t, c.SaveAdminUser(ctx, store.AdminUser{DiscordID: "itest-1", Role: store.AdminRoleStaff, AddedBy: "itest-owner"}))
	require.NoError(t, c.SaveAdminUser(ctx, store.AdminUser{DiscordID: "itest-1", Role: store.AdminRoleAdmin, AddedBy: "itest-owner"}))
	got, err = c.AdminUser(ctx, "itest-1")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, store.AdminRoleAdmin, got.Role)

	// Roles outside admin/staff (e.g. owner) are rejected by the database.
	assert.Error(t, c.SaveAdminUser(ctx, store.AdminUser{DiscordID: "itest-2", Role: store.AdminRoleOwner, AddedBy: "x"}))

	require.NoError(t, c.AddAdminAudit(ctx, store.AdminAuditEntry{ActorDiscordID: "itest-1", Action: "plan.update", Target: "pro", Detail: []byte(`{"price":1}`)}))
	log, err := c.AdminAuditLog(ctx, 5, 0)
	require.NoError(t, err)
	require.NotEmpty(t, log)
	assert.Equal(t, "plan.update", log[0].Action)

	require.NoError(t, c.DeleteAdminUser(ctx, "itest-1"))
	got, err = c.AdminUser(ctx, "itest-1")
	require.NoError(t, err)
	assert.Nil(t, got)
}
