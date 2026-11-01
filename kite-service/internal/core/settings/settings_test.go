package settings

import (
	"bytes"
	"context"
	"sync"
	"testing"

	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testKey = "C223777002779B00BCA3884500B7811329A512DE4916D9575A3847889243A19A"

type fakeSettingStore struct {
	mu   sync.Mutex
	rows map[string]store.Setting
}

func newFakeSettingStore() *fakeSettingStore {
	return &fakeSettingStore{rows: map[string]store.Setting{}}
}

func (f *fakeSettingStore) Settings(context.Context) ([]store.Setting, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]store.Setting, 0, len(f.rows))
	for _, r := range f.rows {
		out = append(out, r)
	}
	return out, nil
}

func (f *fakeSettingStore) SaveSetting(_ context.Context, s store.Setting, _ string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rows[s.Namespace+"."+s.Key] = s
	return nil
}

func testSeed() Snapshot {
	return Snapshot{
		Billing: Billing{MerchantBankName: "MBBank", MerchantAccountNo: "123", CheckoutTTLMinutes: 30, SePaySecretKey: "super-secret"},
		Limits:  Limits{MaxAppsPerUser: 10, MaxAssetSize: 8_000_000},
		Discord: Discord{BotToken: "bot-token", GuildID: "guild"},
		Engine:  Engine{MaxStackDepth: 100, MaxOperations: 100, MaxCredits: 250},
		AI: AI{DefaultModel: "m1", Providers: []AIProvider{{
			ID: "vercel", API: "anthropic", APIKey: "vck_provider_key",
			Models: []AIModel{{Key: "m1", Name: "M1", Model: "vendor/m1", Credits: 7}},
		}}},
	}
}

func newTestManager(t *testing.T, fake *fakeSettingStore, seed Snapshot) *Manager {
	t.Helper()
	crypt, err := util.NewSymmetricCrypt(testKey)
	require.NoError(t, err)
	m, err := NewManager(context.Background(), fake, crypt, seed)
	require.NoError(t, err)
	return m
}

func TestSeedAndRoundTrip(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())

	assert.Equal(t, testSeed(), m.Snapshot())
}

func TestSecretsAreEncryptedAtRest(t *testing.T) {
	fake := newFakeSettingStore()
	newTestManager(t, fake, testSeed())

	for _, plaintext := range []string{"super-secret", "bot-token", "vck_provider_key"} {
		for key, row := range fake.rows {
			assert.False(t, bytes.Contains(row.Value, []byte(plaintext)), "%s leaks %q", key, plaintext)
		}
	}
	assert.True(t, fake.rows["billing.sepay_secret_key"].IsSecret)
	assert.True(t, fake.rows["discord.bot_token"].IsSecret)
	assert.False(t, fake.rows["billing.merchant_account_no"].IsSecret)
	assert.Contains(t, string(fake.rows["billing.merchant_account_no"].Value), "123")
}

func TestExistingNamespacesAreNotReseeded(t *testing.T) {
	fake := newFakeSettingStore()
	m := newTestManager(t, fake, testSeed())

	edited := m.Billing()
	edited.MerchantAccountNo = "edited-in-console"
	require.NoError(t, m.Save(context.Background(), NamespaceBilling, edited, "tester"))

	other := testSeed()
	other.Billing.MerchantAccountNo = "from-toml"
	other.Limits.MaxAppsPerUser = 99
	m2 := newTestManager(t, fake, other)

	assert.Equal(t, "edited-in-console", m2.Billing().MerchantAccountNo, "DB must win over the config file")
	assert.Equal(t, 10, m2.Limits().MaxAppsPerUser)
}

func TestMissingNamespaceIsSeededOnly(t *testing.T) {
	fake := newFakeSettingStore()
	newTestManager(t, fake, testSeed())
	for key, row := range fake.rows {
		if row.Namespace == NamespaceLimits {
			delete(fake.rows, key)
		}
	}

	other := testSeed()
	other.Limits.MaxAppsPerUser = 42
	other.Billing.MerchantAccountNo = "from-toml"
	m := newTestManager(t, fake, other)

	assert.Equal(t, 42, m.Limits().MaxAppsPerUser)
	assert.Equal(t, "123", m.Billing().MerchantAccountNo)
}

func TestSaveClearsSecretAndRejectsWrongKey(t *testing.T) {
	fake := newFakeSettingStore()
	m := newTestManager(t, fake, testSeed())

	b := m.Billing()
	b.SePaySecretKey = ""
	require.NoError(t, m.Save(context.Background(), NamespaceBilling, b, "tester"))
	assert.Equal(t, "", m.Billing().SePaySecretKey)

	// A different encryption key must not silently yield garbage secrets.
	other, err := util.NewSymmetricCrypt("0000000000000000000000000000000000000000000000000000000000000001")
	require.NoError(t, err)
	_, err = NewManager(context.Background(), fake, other, testSeed())
	assert.Error(t, err)

	assert.Error(t, m.Save(context.Background(), "nope", b, "tester"))
}

func TestAIProviderKeysRoundTripAfterSave(t *testing.T) {
	m := newTestManager(t, newFakeSettingStore(), testSeed())

	ai := m.AI()
	ai.Providers = append(ai.Providers, AIProvider{ID: "openai", API: "openai", APIKey: "sk-new"})
	require.NoError(t, m.Save(context.Background(), NamespaceAI, ai, "tester"))

	got := m.AI()
	require.Len(t, got.Providers, 2)
	assert.Equal(t, "vck_provider_key", got.Providers[0].APIKey)
	assert.Equal(t, "sk-new", got.Providers[1].APIKey)
}

// Databases created before the unused billing settings were removed still have
// their rows (migration 039 deletes them). They must be ignored, not break the
// start of the server.
func TestStaleRowsOfRemovedSettingsAreIgnored(t *testing.T) {
	fake := newFakeSettingStore()
	newTestManager(t, fake, testSeed())

	for _, key := range []string{"sepay_bearer_token", "webhook_hmac_secret", "transfer_code_prefix", "sepay_with_qrcode"} {
		fake.rows["billing."+key] = store.Setting{Namespace: NamespaceBilling, Key: key, Value: []byte(`"x"`)}
	}

	m := newTestManager(t, fake, Snapshot{})
	assert.Equal(t, testSeed().Billing, m.Billing())
}
