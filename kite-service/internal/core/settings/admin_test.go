package settings

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func patchOf(t *testing.T, v map[string]any) map[string]json.RawMessage {
	t.Helper()
	out := map[string]json.RawMessage{}
	for k, val := range v {
		raw, err := json.Marshal(val)
		require.NoError(t, err)
		out[k] = raw
	}
	return out
}

func TestViewsNeverExposeSecrets(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())
	views := m.Views()

	raw, err := json.Marshal(views)
	require.NoError(t, err)
	for _, secret := range []string{"super-secret", "bot-token", "vck_provider_key"} {
		assert.NotContains(t, string(raw), secret)
	}

	assert.True(t, views["billing"].SecretsSet["sepay_secret_key"])
	assert.True(t, views["discord"].SecretsSet["bot_token"])
	assert.True(t, views["discord"].SecretsSet["bot_token"])
	assert.False(t, views["discord"].SecretsSet["nope"], "unknown secrets are reported as unset")
	assert.Equal(t, "123", views["billing"].Values["merchant_account_no"])
	assert.True(t, views["engine"].RestartRequired)
	assert.True(t, views["ai"].RestartRequired)
	assert.False(t, views["billing"].RestartRequired)

	providers := views["ai"].Values["providers"].([]any)
	provider := providers[0].(map[string]any)
	assert.Equal(t, true, provider["api_key_set"])
	assert.NotContains(t, provider, "api_key")
}

func TestUpdateIsPartialAndKeepsBlankSecrets(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())
	ctx := context.Background()

	require.NoError(t, m.Update(ctx, NamespaceBilling, patchOf(t, map[string]any{
		"merchant_account_no": "999",
		"sepay_secret_key":    "", // blank = keep
	}), nil, "tester"))

	b := m.Billing()
	assert.Equal(t, "999", b.MerchantAccountNo)
	assert.Equal(t, "super-secret", b.SePaySecretKey)
	assert.Equal(t, "MBBank", b.MerchantBankName, "untouched fields stay")

	require.NoError(t, m.Update(ctx, NamespaceBilling, patchOf(t, map[string]any{
		"sepay_secret_key": "rotated",
	}), nil, "tester"))
	assert.Equal(t, "rotated", m.Billing().SePaySecretKey)
}

func TestUpdateClearsSecretOnlyWhenAsked(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())
	ctx := context.Background()

	require.NoError(t, m.Update(ctx, NamespaceBilling, map[string]json.RawMessage{}, []string{"sepay_secret_key"}, "tester"))
	assert.Equal(t, "", m.Billing().SePaySecretKey)
	assert.Equal(t, "123", m.Billing().MerchantAccountNo, "other settings are untouched")

	err := m.Update(ctx, NamespaceBilling, map[string]json.RawMessage{}, []string{"merchant_account_no"}, "tester")
	assert.ErrorAs(t, err, new(*ValidationError), "only secrets can be cleared")
}

func TestUpdateRejectsBadInput(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())
	ctx := context.Background()
	var verr *ValidationError

	cases := map[string]struct {
		ns    string
		patch map[string]any
	}{
		"unknown group":       {"nope", map[string]any{}},
		"unknown key":         {NamespaceBilling, map[string]any{"made_up": 1}},
		"wrong type":          {NamespaceLimits, map[string]any{"max_apps_per_user": "ten"}},
		"negative limit":      {NamespaceLimits, map[string]any{"max_apps_per_user": -1}},
		"negative ttl":        {NamespaceBilling, map[string]any{"checkout_ttl_minutes": -5}},
		"removed setting":     {NamespaceBilling, map[string]any{"sepay_bearer_token": "x"}},
		"bad guild":           {NamespaceDiscord, map[string]any{"guild_id": "abc"}},
		"engine zero":         {NamespaceEngine, map[string]any{"max_stack_depth": 0}},
		"default not a model": {NamespaceAI, map[string]any{"default_model": "ghost"}},
		"bad api type": {NamespaceAI, map[string]any{"providers": []map[string]any{
			{"id": "p", "api": "gemini", "models": []any{}},
		}}},
		"duplicate model key": {NamespaceAI, map[string]any{"providers": []map[string]any{
			{"id": "a", "api": "openai", "models": []map[string]any{{"key": "k", "name": "K", "model": "m"}}},
			{"id": "b", "api": "openai", "models": []map[string]any{{"key": "k", "name": "K", "model": "m"}}},
		}}},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			err := m.Update(ctx, tc.ns, patchOf(t, tc.patch), nil, "tester")
			require.ErrorAs(t, err, &verr)
		})
	}

	assert.Equal(t, testSeed(), m.Snapshot(), "rejected updates must not change anything")
}

func TestUpdateAIKeepsProviderKeyWhenOmitted(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())
	ctx := context.Background()

	require.NoError(t, m.Update(ctx, NamespaceAI, patchOf(t, map[string]any{
		"default_model": "m2",
		"providers": []map[string]any{{
			"id": "vercel", "api": "anthropic", // api_key omitted -> kept
			"models": []map[string]any{
				{"key": "m1", "name": "M1", "model": "vendor/m1", "credits": 7},
				{"key": "m2", "name": "M2", "model": "vendor/m2", "credits": 9},
			},
		}, {
			"id": "fresh", "api": "openai", "api_key": "sk-new", "models": []any{},
		}},
	}), nil, "tester"))

	ai := m.AI()
	assert.Equal(t, "m2", ai.DefaultModel)
	require.Len(t, ai.Providers, 2)
	assert.Equal(t, "vck_provider_key", ai.Providers[0].APIKey)
	assert.Equal(t, "sk-new", ai.Providers[1].APIKey)
	assert.Len(t, ai.Providers[0].Models, 2)
}
