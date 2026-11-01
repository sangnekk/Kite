package settings

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/db/postgres"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Runs against a real database (all migrations applied) given by
// KITE_TEST_POSTGRES_DSN, and is skipped otherwise.
func TestManagerAgainstPostgres(t *testing.T) {
	dsn := os.Getenv("KITE_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("KITE_TEST_POSTGRES_DSN not set")
	}

	ctx := context.Background()
	pg, err := postgres.New(dsn, 1)
	require.NoError(t, err)
	defer pg.DB.Close()

	_, err = pg.DB.Exec(ctx, "DELETE FROM settings")
	require.NoError(t, err)
	t.Cleanup(func() { _, _ = pg.DB.Exec(ctx, "DELETE FROM settings") })

	crypt, err := util.NewSymmetricCrypt(testKey)
	require.NoError(t, err)

	seed := testSeed()
	m, err := NewManager(ctx, pg, crypt, seed)
	require.NoError(t, err)
	assert.Equal(t, seed, m.Snapshot())

	// Secrets must be ciphertext in the actual table, plain values stay readable.
	rows, err := pg.DB.Query(ctx, "SELECT namespace, key, value::text, is_secret FROM settings")
	require.NoError(t, err)
	defer rows.Close()
	seen := map[string]bool{}
	for rows.Next() {
		var ns, key, value string
		var secret bool
		require.NoError(t, rows.Scan(&ns, &key, &value, &secret))
		seen[ns+"."+key] = secret
		for _, plaintext := range []string{"super-secret", "bot-token", "vck_provider_key"} {
			assert.False(t, strings.Contains(value, plaintext), "%s.%s stores %q in plaintext", ns, key, plaintext)
		}
	}
	require.NoError(t, rows.Err())
	assert.True(t, seen["billing.sepay_secret_key"])
	assert.True(t, seen["discord.bot_token"])
	assert.False(t, seen["limits.max_apps_per_user"])

	// A second process (e.g. another cluster) sees console edits after a reload.
	edited := m.Limits()
	edited.MaxAppsPerUser = 3
	require.NoError(t, m.Save(ctx, NamespaceLimits, edited, "tester"))

	other, err := NewManager(ctx, pg, crypt, testSeed())
	require.NoError(t, err)
	assert.Equal(t, 3, other.Limits().MaxAppsPerUser)
	assert.Equal(t, "vck_provider_key", other.AI().Providers[0].APIKey)
}
