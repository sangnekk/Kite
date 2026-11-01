package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/api/handler"
	"github.com/kitecloud/kite/kite-service/internal/core/fulfillment"
	"github.com/kitecloud/kite/kite-service/internal/core/plan"
	"github.com/kitecloud/kite/kite-service/internal/core/settings"
	"github.com/kitecloud/kite/kite-service/internal/db/postgres"
	"github.com/kitecloud/kite/kite-service/internal/model"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// These tests drive the real routes against a real database given by
// KITE_TEST_POSTGRES_DSN (all migrations applied) and are skipped otherwise.
// Packages sharing one database must not run in parallel: use `go test -p 1`.

const (
	ownerDiscordID    = "100000000000000001"
	staffDiscordID    = "100000000000000002"
	adminDiscordID    = "100000000000000003"
	strangerDiscordID = "100000000000000004"
	newcomerDiscordID = "100000000000000005"
)

type envelope struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type env struct {
	t      *testing.T
	pg     *postgres.Client
	mux    *http.ServeMux
	plans  *plan.PlanManager
	config *settings.Manager
}

func fakeSession(next handler.HandlerFunc) handler.HandlerFunc {
	return func(c *handler.Context) error {
		uid := c.Header("X-Test-User")
		if uid == "" {
			return handler.ErrUnauthorized("unauthorized", "Session required")
		}
		c.Session = &model.Session{UserID: uid}
		return next(c)
	}
}

func cleanup(t *testing.T, pg *postgres.Client) {
	t.Helper()
	for _, s := range []string{
		`DELETE FROM admin_audit_log WHERE actor_discord_id LIKE '1000000000000000%'`,
		`DELETE FROM admin_users WHERE discord_id LIKE '1000000000000000%'`,
		`DELETE FROM entitlements WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM payment_sessions WHERE app_id LIKE 'itest-%'`,
		`DELETE FROM subscriptions WHERE user_id LIKE 'itest-%'`,
		`DELETE FROM sessions WHERE user_id LIKE 'itest-%'`,
		`DELETE FROM apps WHERE id LIKE 'itest-%'`,
		`DELETE FROM users WHERE id LIKE 'itest-%'`,
		`DELETE FROM plans WHERE id LIKE 'itest-%'`,
	} {
		_, err := pg.DB.Exec(context.Background(), s)
		require.NoError(t, err, s)
	}
}

func newEnv(t *testing.T) *env {
	t.Helper()
	dsn := os.Getenv("KITE_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("KITE_TEST_POSTGRES_DSN not set")
	}

	ctx := context.Background()
	pg, err := postgres.New(dsn, 1)
	require.NoError(t, err)
	t.Cleanup(pg.DB.Close)

	cleanup(t, pg)
	t.Cleanup(func() { cleanup(t, pg) })
	_, err = pg.DB.Exec(ctx, `DELETE FROM settings`)
	require.NoError(t, err)
	t.Cleanup(func() { _, _ = pg.DB.Exec(ctx, `DELETE FROM settings`) })

	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	for _, u := range [][2]string{
		{"itest-owner", ownerDiscordID}, {"itest-staff", staffDiscordID}, {"itest-admin", adminDiscordID},
		{"itest-stranger", strangerDiscordID}, {"itest-newcomer", newcomerDiscordID},
	} {
		_, err := pg.DB.Exec(ctx, `INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at)
			VALUES ($1,$2,$3,$4,$5,'`+now+`','`+now+`')`, u[0], u[0]+"@example.com", u[0], u[1], "name-"+u[0])
		require.NoError(t, err)
	}
	_, err = pg.DB.Exec(ctx, `INSERT INTO admin_users (discord_id, role, added_by) VALUES ($1,'staff','x'),($2,'admin','x')`, staffDiscordID, adminDiscordID)
	require.NoError(t, err)

	_, err = pg.DB.Exec(ctx, `INSERT INTO apps (id,name,enabled,owner_user_id,creator_user_id,discord_token,discord_id,created_at,updated_at)
		VALUES ('itest-app','Test app',true,'itest-stranger','itest-stranger','TOKEN','itest-discord','`+now+`','`+now+`')`)
	require.NoError(t, err)

	crypt, err := util.NewSymmetricCrypt("C223777002779B00BCA3884500B7811329A512DE4916D9575A3847889243A19A")
	require.NoError(t, err)
	cfg, err := settings.NewManager(ctx, pg, crypt, settings.Snapshot{
		Billing: settings.Billing{SePaySecretKey: "top-secret", MerchantAccountNo: "123"},
		Limits:  settings.Limits{MaxAppsPerUser: 10},
		Engine:  settings.Engine{MaxStackDepth: 100, MaxOperations: 100, MaxCredits: 250},
	})
	require.NoError(t, err)

	plans, err := plan.NewPlanManager(ctx, pg, pg, pg, pg, nil, plan.PlanManagerConfig{})
	require.NoError(t, err)
	require.NoError(t, pg.SavePlan(ctx, model.PlanRecord{Plan: model.Plan{
		ID: "itest-plan", Title: "Test plan", Price: 39000, PaymentAmount: 39000, PremiumDurationDays: 30, FeatureMaxCommands: 80,
	}}))
	require.NoError(t, plans.Reload(ctx))

	access := NewAccess(ownerDiscordID, pg, pg)
	h := NewHandler(Deps{
		Access: access, Console: pg, Admins: pg, Users: pg, Payments: pg, PlanStore: pg,
		PlanManager: plans, Settings: cfg,
		Fulfiller: fulfillment.New(pg, pg, pg, pg, plans),
	})

	mux := http.NewServeMux()
	h.RegisterRoutes(handler.Group(mux, "/v1"), fakeSession)
	return &env{t: t, pg: pg, mux: mux, plans: plans, config: cfg}
}

func (e *env) do(user, method, path string, body any) (int, envelope) {
	e.t.Helper()
	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		require.NoError(e.t, err)
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, "/v1/admin"+path, reader)
	req.Header.Set("Content-Type", "application/json")
	if user != "" {
		req.Header.Set("X-Test-User", user)
	}
	rec := httptest.NewRecorder()
	e.mux.ServeHTTP(rec, req)

	var env envelope
	require.NoError(e.t, json.Unmarshal(rec.Body.Bytes(), &env), rec.Body.String())
	return rec.Code, env
}

func (e *env) expectError(user, method, path string, body any, status int, code string) {
	e.t.Helper()
	got, env := e.do(user, method, path, body)
	require.NotNil(e.t, env.Error, "%s %s as %s should fail", method, path, user)
	assert.Equal(e.t, status, got, "%s %s as %s: %s", method, path, user, env.Error.Message)
	assert.Equal(e.t, code, env.Error.Code, "%s %s as %s", method, path, user)
}

func (e *env) expectOK(user, method, path string, body any, out any) {
	e.t.Helper()
	got, env := e.do(user, method, path, body)
	if env.Error != nil {
		e.t.Fatalf("%s %s as %s failed: %d %s: %s", method, path, user, got, env.Error.Code, env.Error.Message)
	}
	require.Equal(e.t, http.StatusOK, got)
	if out != nil {
		require.NoError(e.t, json.Unmarshal(env.Data, out))
	}
}

func TestAccessMatrix(t *testing.T) {
	e := newEnv(t)

	// Not signed in / not an admin.
	e.expectError("", "GET", "/me", nil, http.StatusUnauthorized, "unauthorized")
	e.expectError("itest-stranger", "GET", "/me", nil, http.StatusForbidden, "not_admin")
	e.expectError("itest-stranger", "GET", "/users", nil, http.StatusForbidden, "not_admin")
	e.expectError("itest-newcomer", "GET", "/dashboard", nil, http.StatusForbidden, "not_admin")

	var me MeResponse
	e.expectOK("itest-owner", "GET", "/me", nil, &me)
	assert.Equal(t, "owner", me.Role, "the system owner needs no database row")
	e.expectOK("itest-admin", "GET", "/me", nil, &me)
	assert.Equal(t, "admin", me.Role)
	e.expectOK("itest-staff", "GET", "/me", nil, &me)
	assert.Equal(t, "staff", me.Role)

	// Staff reads, but cannot change anything or see secrets/staff/audit.
	e.expectOK("itest-staff", "GET", "/users", nil, nil)
	e.expectOK("itest-staff", "GET", "/plans", nil, nil)
	e.expectOK("itest-staff", "GET", "/revenue/summary", nil, nil)
	for _, w := range []struct{ method, path string }{
		{"POST", "/users/itest-stranger/force-logout"},
		{"PATCH", "/apps/itest-app"},
		{"POST", "/apps/itest-app/kill-flows"},
		{"POST", "/billing/subscriptions/x/cancel"},
		{"POST", "/billing/entitlements"},
		{"DELETE", "/billing/entitlements/x"},
		{"PATCH", "/billing/payment-sessions/x"},
		{"POST", "/plans"},
		{"PUT", "/plans/itest-plan"},
		{"PUT", "/plans/order"},
		{"POST", "/plans/itest-plan/archive"},
		{"GET", "/audit-log"},
		{"GET", "/settings"},
		{"PUT", "/settings/limits"},
		{"GET", "/staff"},
		{"POST", "/staff"},
		{"DELETE", "/staff/" + staffDiscordID},
	} {
		e.expectError("itest-staff", w.method, w.path, map[string]any{}, http.StatusForbidden, "insufficient_role")
	}

	// Admin changes data but cannot touch settings or staff.
	e.expectOK("itest-admin", "GET", "/audit-log", nil, nil)
	for _, w := range []struct{ method, path string }{
		{"GET", "/settings"}, {"PUT", "/settings/limits"}, {"GET", "/staff"}, {"POST", "/staff"}, {"DELETE", "/staff/" + staffDiscordID},
	} {
		e.expectError("itest-admin", w.method, w.path, map[string]any{}, http.StatusForbidden, "insufficient_role")
	}
}

func TestRemovedAdminLosesAccessImmediately(t *testing.T) {
	e := newEnv(t)
	e.expectOK("itest-staff", "GET", "/users", nil, nil)
	e.expectOK("itest-owner", "DELETE", "/staff/"+staffDiscordID, nil, nil)
	e.expectError("itest-staff", "GET", "/users", nil, http.StatusForbidden, "not_admin")
}

func TestStaffManagement(t *testing.T) {
	e := newEnv(t)

	var list StaffListResponse
	e.expectOK("itest-owner", "GET", "/staff", nil, &list)
	assert.Equal(t, ownerDiscordID, list.SystemOwner)
	assert.Len(t, list.Staff, 2)

	e.expectError("itest-owner", "POST", "/staff", StaffRequest{DiscordID: "abc", Role: "staff"}, 400, "invalid_discord_id")
	e.expectError("itest-owner", "POST", "/staff", StaffRequest{DiscordID: newcomerDiscordID, Role: "owner"}, 400, "invalid_role")
	e.expectError("itest-owner", "POST", "/staff", StaffRequest{DiscordID: ownerDiscordID, Role: "admin"}, 400, "owner_is_implicit")
	e.expectError("itest-owner", "POST", "/staff", StaffRequest{DiscordID: staffDiscordID, Role: "admin"}, 400, "staff_exists")
	e.expectError("itest-owner", "DELETE", "/staff/"+ownerDiscordID, nil, 400, "owner_is_implicit")
	e.expectError("itest-owner", "PUT", "/staff/"+newcomerDiscordID, StaffUpdateRequest{Role: "admin"}, 404, "not_found")

	var added StaffItem
	e.expectOK("itest-owner", "POST", "/staff", StaffRequest{DiscordID: newcomerDiscordID, Role: "staff"}, &added)
	assert.Equal(t, ownerDiscordID, added.AddedBy)
	e.expectOK("itest-newcomer", "GET", "/users", nil, nil)
	e.expectError("itest-newcomer", "POST", "/apps/itest-app/kill-flows", nil, 403, "insufficient_role")

	e.expectOK("itest-owner", "PUT", "/staff/"+newcomerDiscordID, StaffUpdateRequest{Role: "admin"}, &added)
	assert.Equal(t, "admin", added.Role)
	e.expectOK("itest-newcomer", "POST", "/apps/itest-app/kill-flows", nil, nil)

	// Every change above is in the audit log, attributed to the actor.
	var audit []AuditItem
	e.expectOK("itest-owner", "GET", "/audit-log", nil, &audit)
	actions := map[string]bool{}
	for _, a := range audit {
		actions[a.Action] = true
		assert.Equal(t, ownerDiscordID == a.ActorDiscordID || newcomerDiscordID == a.ActorDiscordID, true)
	}
	assert.True(t, actions["staff.add"] && actions["staff.update"] && actions["app.kill_flows"], "%v", actions)
}

func TestSettingsMaskSecretsAndValidate(t *testing.T) {
	e := newEnv(t)

	code, env := e.do("itest-owner", "GET", "/settings", nil)
	require.Equal(t, 200, code)
	assert.NotContains(t, string(env.Data), "top-secret", "secrets never leave the server")
	var views map[string]settings.NamespaceView
	require.NoError(t, json.Unmarshal(env.Data, &views))
	assert.True(t, views["billing"].SecretsSet["sepay_secret_key"])
	assert.Equal(t, "123", views["billing"].Values["merchant_account_no"])

	e.expectError("itest-owner", "PUT", "/settings/billing", SettingsUpdateRequest{}, 400, "no_changes")
	e.expectError("itest-owner", "PUT", "/settings/limits", map[string]any{"values": map[string]any{"max_apps_per_user": -5}}, 400, "invalid_settings")
	e.expectError("itest-owner", "PUT", "/settings/nope", map[string]any{"values": map[string]any{"a": 1}}, 400, "invalid_settings")

	var view settings.NamespaceView
	e.expectOK("itest-owner", "PUT", "/settings/billing", map[string]any{"values": map[string]any{
		"merchant_account_no": "999", "sepay_secret_key": "",
	}}, &view)
	assert.Equal(t, "999", e.config.Billing().MerchantAccountNo)
	assert.Equal(t, "top-secret", e.config.Billing().SePaySecretKey, "a blank secret keeps the stored one")
	assert.True(t, view.SecretsSet["sepay_secret_key"])

	// The audit trail names the changed settings but never their values.
	_, auditEnv := e.do("itest-owner", "GET", "/audit-log", nil)
	assert.Contains(t, string(auditEnv.Data), "merchant_account_no")
	assert.NotContains(t, string(auditEnv.Data), "999")
	assert.NotContains(t, string(auditEnv.Data), "top-secret")
}

func TestPlanRules(t *testing.T) {
	e := newEnv(t)

	valid := func(id string) PlanItem {
		return PlanItem{ID: id, Title: "Plan " + id, Price: 1000, PaymentAmount: 1000, FeatureMaxCustomTables: -1}
	}

	e.expectError("itest-admin", "POST", "/plans", valid("Bad ID!"), 400, "invalid_plan")
	bad := valid("itest-bad")
	bad.FeatureMaxCommands = -1
	e.expectError("itest-admin", "POST", "/plans", bad, 400, "invalid_plan")
	bad = valid("itest-bad")
	bad.Price = -1
	e.expectError("itest-admin", "POST", "/plans", bad, 400, "invalid_plan")
	e.expectError("itest-admin", "POST", "/plans", valid("itest-plan"), 400, "plan_exists")

	var created PlanItem
	e.expectOK("itest-admin", "POST", "/plans", valid("itest-new"), &created)
	assert.False(t, created.Archived)
	assert.Equal(t, -1, created.FeatureMaxCustomTables)
	assert.NotNil(t, e.plans.PlanByID("itest-new"), "new plans are live immediately")

	// Update: id is immutable, archive state is not changed through PUT.
	update := created
	update.Title = "Renamed"
	update.FeatureMaxCommands = 123
	update.Archived = true
	var updated PlanItem
	e.expectOK("itest-admin", "PUT", "/plans/itest-new", update, &updated)
	assert.Equal(t, "Renamed", updated.Title)
	assert.False(t, updated.Archived)
	assert.Equal(t, 123, e.plans.PlanByID("itest-new").FeatureMaxCommands)
	update.ID = "other"
	e.expectError("itest-admin", "PUT", "/plans/itest-new", update, 400, "invalid_plan")
	e.expectError("itest-admin", "PUT", "/plans/itest-ghost", valid("itest-ghost"), 404, "not_found")

	// Default plan: exactly one, cannot be demoted/archived directly.
	var all []PlanItem
	e.expectOK("itest-admin", "GET", "/plans", nil, &all)
	var currentDefault string
	for _, p := range all {
		if p.Default {
			currentDefault = p.ID
		}
	}
	if currentDefault == "" {
		makeDefault := created
		makeDefault.Default = true
		e.expectOK("itest-admin", "PUT", "/plans/itest-new", makeDefault, &updated)
		currentDefault = "itest-new"
	}
	demote := PlanItem{ID: currentDefault, Title: "x"}
	e.expectError("itest-admin", "PUT", "/plans/"+currentDefault, demote, 400, "default_required")
	e.expectError("itest-admin", "POST", "/plans/"+currentDefault+"/archive", nil, 400, "cannot_archive_default")

	// Promoting another plan demotes the old default atomically.
	other := "itest-plan"
	if currentDefault == other {
		other = "itest-new"
	}
	otherPlan := planItem(model.PlanRecord{Plan: *e.plans.PlanByID(other)})
	otherPlan.Default = true
	e.expectOK("itest-admin", "PUT", "/plans/"+other, otherPlan, &updated)
	defaults := 0
	for _, r := range e.plans.Records() {
		if r.Default {
			defaults++
			assert.Equal(t, other, r.ID)
		}
	}
	assert.Equal(t, 1, defaults)

	// Archiving hides a plan from sale but existing entitlements still resolve it.
	e.expectOK("itest-admin", "POST", "/plans/"+currentDefault+"/archive", nil, &updated)
	assert.True(t, updated.Archived)
	assert.True(t, e.plans.IsArchived(currentDefault))
	assert.NotNil(t, e.plans.PlanByID(currentDefault))
	for _, p := range e.plans.Plans() {
		assert.NotEqual(t, currentDefault, p.ID, "archived plans are not offered")
	}
	e.expectOK("itest-admin", "POST", "/plans/"+currentDefault+"/restore", nil, &updated)
	assert.False(t, updated.Archived)

	// Ordering.
	e.expectError("itest-admin", "PUT", "/plans/order", PlanOrderRequest{IDs: []string{"itest-ghost"}}, 400, "unknown_plan")
	e.expectError("itest-admin", "PUT", "/plans/order", PlanOrderRequest{IDs: []string{"itest-new", "itest-new"}}, 400, "duplicate_plan")
	e.expectOK("itest-admin", "PUT", "/plans/order", PlanOrderRequest{IDs: []string{"itest-new", "itest-plan"}}, &all)
	positions := map[string]int{}
	for i, p := range all {
		positions[p.ID] = i
	}
	assert.Equal(t, 0, positions["itest-new"])
	assert.Equal(t, 1, positions["itest-plan"])
}

func TestAppControlsAndSessions(t *testing.T) {
	e := newEnv(t)
	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	_, err := e.pg.DB.Exec(context.Background(), `INSERT INTO sessions (key_hash,user_id,created_at,expires_at)
		VALUES ('itest-k1','itest-stranger','`+now+`','2999-01-01 00:00:00')`)
	require.NoError(t, err)

	e.expectError("itest-admin", "PATCH", "/apps/itest-app", AppUpdateRequest{}, 400, "no_changes")
	e.expectError("itest-admin", "PATCH", "/apps/itest-ghost", map[string]any{"enabled": false}, 404, "not_found")
	e.expectError("itest-admin", "GET", "/apps/itest-ghost", nil, 404, "not_found")

	reason := "violates the rules"
	var app AppDetail
	e.expectOK("itest-admin", "PATCH", "/apps/itest-app", map[string]any{"enabled": false, "disabled_reason": reason}, &app)
	assert.False(t, app.Enabled)
	require.NotNil(t, app.DisabledReason)
	assert.Equal(t, reason, *app.DisabledReason)

	e.expectOK("itest-admin", "PATCH", "/apps/itest-app", map[string]any{"enabled": true}, &app)
	assert.True(t, app.Enabled)
	assert.Nil(t, app.DisabledReason, "re-enabling clears the reason")

	// The Discord token must never be part of any admin response.
	_, raw := e.do("itest-admin", "GET", "/apps/itest-app", nil)
	assert.NotContains(t, string(raw.Data), "TOKEN")
	_, raw = e.do("itest-admin", "GET", "/apps?search=Test", nil)
	assert.NotContains(t, string(raw.Data), "TOKEN")
	assert.Contains(t, string(raw.Data), "itest-app")

	var logout ForceLogoutResponse
	e.expectOK("itest-admin", "POST", "/users/itest-stranger/force-logout", nil, &logout)
	assert.EqualValues(t, 1, logout.SessionsRemoved)
	e.expectError("itest-admin", "POST", "/users/itest-ghost/force-logout", nil, 404, "not_found")

	e.expectError("itest-admin", "GET", "/users?page=0", nil, 400, "invalid_page")
	e.expectError("itest-admin", "GET", "/users?page_size=1000", nil, 400, "invalid_page_size")
	e.expectError("itest-admin", "GET", "/logs?level=loud", nil, 400, "invalid_level")
	e.expectError("itest-admin", "GET", "/revenue/summary?period=year", nil, 400, "invalid_period")
}

func TestPaymentAndEntitlementFlows(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	insertSession := func(id, paymentID, status string) {
		_, err := e.pg.DB.Exec(ctx, `INSERT INTO payment_sessions (id,provider,payment_id,app_id,plan_id,amount,qr_image_url,qr_content,status,created_at,updated_at)
			VALUES ($1,'sepay',$2,'itest-app','itest-plan',39000,'','',$3,'`+now+`','`+now+`')`, id, paymentID, status)
		require.NoError(t, err)
	}
	activeEntitlements := func() int {
		list, err := e.pg.ActiveEntitlements(ctx, "itest-app", time.Now().UTC())
		require.NoError(t, err)
		return len(list)
	}

	// Confirming a pending payment grants the plan, like a bank notification.
	insertSession("itest-p1", "itest-pay1", "pending")
	require.Zero(t, activeEntitlements())
	e.expectError("itest-admin", "PATCH", "/billing/payment-sessions/itest-p1", map[string]any{"status": "refunded"}, 400, "invalid_status")
	e.expectOK("itest-admin", "PATCH", "/billing/payment-sessions/itest-p1", map[string]any{"status": "paid"}, nil)
	assert.Equal(t, 1, activeEntitlements(), "marking paid must grant access")

	var status string
	require.NoError(t, e.pg.DB.QueryRow(ctx, `SELECT status FROM payment_sessions WHERE id='itest-p1'`).Scan(&status))
	assert.Equal(t, "paid", status)

	// It cannot be confirmed twice, nor cancelled once paid.
	e.expectError("itest-admin", "PATCH", "/billing/payment-sessions/itest-p1", map[string]any{"status": "paid"}, 400, "payment_session_not_pending")
	e.expectError("itest-admin", "PATCH", "/billing/payment-sessions/itest-p1", map[string]any{"status": "failed"}, 400, "payment_session_not_pending")

	// A second payment for an app that already has a plan is rejected, never stacked.
	insertSession("itest-p2", "itest-pay2", "pending")
	e.expectError("itest-admin", "PATCH", "/billing/payment-sessions/itest-p2", map[string]any{"status": "paid"}, 400, "plan_already_active")
	assert.Equal(t, 1, activeEntitlements())
	e.expectOK("itest-admin", "PATCH", "/billing/payment-sessions/itest-p2", map[string]any{"status": "failed"}, nil)
	e.expectError("itest-admin", "PATCH", "/billing/payment-sessions/itest-ghost", map[string]any{"status": "paid"}, 404, "not_found")

	// Cancelling the subscription revokes the plan.
	var subs ListResponse[SubscriptionItem]
	e.expectOK("itest-admin", "GET", "/billing/subscriptions?status=active&search=itest-stranger", nil, &subs)
	require.Equal(t, 1, subs.Total)
	e.expectOK("itest-admin", "POST", "/billing/subscriptions/"+subs.Items[0].ID+"/cancel", nil, nil)
	assert.Zero(t, activeEntitlements(), "a cancelled subscription must take the plan away")
	e.expectError("itest-admin", "POST", "/billing/subscriptions/itest-ghost/cancel", nil, 404, "not_found")

	// Manual grants.
	e.expectError("itest-admin", "POST", "/billing/entitlements", EntitlementGrantRequest{AppID: "itest-app", PlanID: "ghost"}, 400, "unknown_plan")
	e.expectError("itest-admin", "POST", "/billing/entitlements", EntitlementGrantRequest{AppID: "itest-ghost", PlanID: "itest-plan"}, 404, "not_found")
	e.expectError("itest-admin", "POST", "/billing/entitlements", EntitlementGrantRequest{AppID: "itest-app", PlanID: "itest-plan", DurationDays: -1}, 400, "invalid_duration")

	var granted EntitlementItem
	e.expectOK("itest-admin", "POST", "/billing/entitlements", EntitlementGrantRequest{AppID: "itest-app", PlanID: "itest-plan", DurationDays: 7}, &granted)
	assert.Equal(t, "manual", granted.Type)
	require.NotNil(t, granted.EndsAt)
	assert.WithinDuration(t, time.Now().UTC().AddDate(0, 0, 7), *granted.EndsAt, time.Minute)
	assert.Equal(t, 1, activeEntitlements())

	e.expectOK("itest-admin", "DELETE", "/billing/entitlements/"+granted.ID, nil, nil)
	assert.Zero(t, activeEntitlements())
	e.expectError("itest-admin", "DELETE", "/billing/entitlements/"+granted.ID, nil, 404, "not_found")
}
