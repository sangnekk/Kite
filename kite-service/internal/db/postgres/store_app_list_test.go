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

func cleanAppListFixture(t *testing.T, c *Client) {
	t.Helper()
	execAll(t, c,
		`DELETE FROM collaborators WHERE app_id LIKE 'itest-al-%'`,
		`DELETE FROM apps WHERE id LIKE 'itest-al-%'`,
		`DELETE FROM users WHERE id LIKE 'itest-al-%'`,
	)
}

func seedAppListFixture(t *testing.T, c *Client) {
	t.Helper()
	cleanAppListFixture(t, c)
	t.Cleanup(func() { cleanAppListFixture(t, c) })

	execAll(t, c,
		`INSERT INTO users (id,email,display_name,discord_id,discord_username,created_at,updated_at) VALUES
			('itest-al-owner','al-o@example.com','Owner','itest-al-d1','owner',now(),now()),
			('itest-al-admin','al-a@example.com','Admin','itest-al-d2','admin',now(),now()),
			('itest-al-guest','al-g@example.com','Guest','itest-al-d3','guest',now(),now()),
			('itest-al-other','al-x@example.com','Other','itest-al-d4','other',now(),now())`,
		`INSERT INTO apps (id,name,enabled,owner_user_id,creator_user_id,discord_token,discord_id,created_at,updated_at) VALUES
			('itest-al-app1','First',true,'itest-al-owner','itest-al-owner','t','itest-al-da1',now() - interval '2 minute',now()),
			('itest-al-app2','Second',true,'itest-al-owner','itest-al-owner','t','itest-al-da2',now() - interval '1 minute',now()),
			('itest-al-app3','Third',true,'itest-al-other','itest-al-other','t','itest-al-da3',now(),now())`,
		// admin was added by the owner, guest by the admin; legacy has no inviter.
		`INSERT INTO collaborators (user_id,app_id,role,created_at,updated_at,invited_by_user_id) VALUES
			('itest-al-admin','itest-al-app1','admin',now(),now(),'itest-al-owner'),
			('itest-al-guest','itest-al-app1','admin',now(),now(),'itest-al-admin'),
			('itest-al-admin','itest-al-app3','admin',now(),now(),NULL)`,
	)
}

func ids(entries []*model.AppListEntry) []string {
	out := make([]string, len(entries))
	for i, e := range entries {
		out[i] = e.ID
	}
	return out
}

func TestAppListShowsEachAppOnceWithWhoAddedYou(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	seedAppListFixture(t, c)

	// The owner of an app with two collaborators sees it once, not once per
	// collaborator, and was not "invited" to their own apps.
	owner, err := c.AppListByUser(ctx, "itest-al-owner")
	require.NoError(t, err)
	assert.Equal(t, []string{"itest-al-app2", "itest-al-app1"}, ids(owner), "newest first, each exactly once")
	for _, e := range owner {
		assert.False(t, e.InvitedByUserID.Valid)
	}

	// A collaborator sees the apps they were added to and who added them.
	admin, err := c.AppListByUser(ctx, "itest-al-admin")
	require.NoError(t, err)
	require.Equal(t, []string{"itest-al-app3", "itest-al-app1"}, ids(admin))
	assert.False(t, admin[0].InvitedByUserID.Valid, "added before the inviter was recorded")
	assert.Equal(t, "itest-al-owner", admin[1].InvitedByUserID.String)

	// The guest was added by the admin, not by the owner.
	guest, err := c.AppListByUser(ctx, "itest-al-guest")
	require.NoError(t, err)
	require.Equal(t, []string{"itest-al-app1"}, ids(guest))
	assert.Equal(t, "itest-al-admin", guest[0].InvitedByUserID.String)
	assert.Equal(t, "itest-al-owner", guest[0].OwnerUserID)

	// Someone without any relation sees nothing of them, an owner only theirs.
	other, err := c.AppListByUser(ctx, "itest-al-other")
	require.NoError(t, err)
	assert.Equal(t, []string{"itest-al-app3"}, ids(other))
}

func TestCreateCollaboratorRemembersWhoAddedThem(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	seedAppListFixture(t, c)

	now := time.Now().UTC()
	for _, limit := range []int{-1, 5} { // without and with the quota check
		execAll(t, c, `DELETE FROM collaborators WHERE user_id = 'itest-al-other' AND app_id = 'itest-al-app2'`)

		created, err := c.CreateCollaborator(ctx, &model.AppCollaborator{
			AppID: "itest-al-app2", UserID: "itest-al-other", Role: "admin", CreatedAt: now, UpdatedAt: now,
			InvitedByUserID: null.StringFrom("itest-al-owner"),
		}, limit)
		require.NoError(t, err, "limit %d", limit)
		assert.Equal(t, "itest-al-owner", created.InvitedByUserID.String, "limit %d", limit)

		list, err := c.AppListByUser(ctx, "itest-al-other")
		require.NoError(t, err)
		var found bool
		for _, e := range list {
			if e.ID == "itest-al-app2" {
				found = true
				assert.Equal(t, "itest-al-owner", e.InvitedByUserID.String)
			}
		}
		assert.True(t, found, "the new collaborator sees the app")
	}
}

func TestSetAppDiscordAvatar(t *testing.T) {
	c := newTestClient(t)
	ctx := context.Background()
	seedAppListFixture(t, c)

	updatedAt := func() time.Time {
		app, err := c.App(ctx, "itest-al-app1")
		require.NoError(t, err)
		return app.UpdatedAt
	}
	before := updatedAt()

	require.NoError(t, c.SetAppDiscordAvatar(ctx, "itest-al-app1", "abc123"))
	app, err := c.App(ctx, "itest-al-app1")
	require.NoError(t, err)
	assert.Equal(t, "abc123", app.DiscordAvatar.String)
	assert.True(t, app.DiscordAvatar.Valid)

	// updated_at is what makes the gateway manager restart a bot, so storing an
	// avatar must never change it.
	assert.Equal(t, before, updatedAt())
	changed, err := c.EnabledAppsUpdatedSince(ctx, before)
	require.NoError(t, err)
	for _, a := range changed {
		assert.NotEqual(t, "itest-al-app1", a.ID, "an avatar change must not look like an app change")
	}

	// A bot that has no avatar anymore clears it.
	require.NoError(t, c.SetAppDiscordAvatar(ctx, "itest-al-app1", ""))
	app, err = c.App(ctx, "itest-al-app1")
	require.NoError(t, err)
	assert.False(t, app.DiscordAvatar.Valid)

	// An unknown app is a no-op, not an error.
	assert.NoError(t, c.SetAppDiscordAvatar(ctx, "itest-al-missing", "x"))
}
