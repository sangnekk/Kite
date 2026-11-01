// Package settings holds the runtime configuration that used to live in
// kite.toml and is now stored in the database and edited from the admin
// console. Secrets are encrypted with the key from the config file, which is
// intentionally never stored in the database.
package settings

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"slices"
	"sync"
	"time"

	"github.com/kitecloud/kite/kite-service/internal/store"
	"github.com/kitecloud/kite/kite-service/internal/util"
)

// reloadInterval is how often every cluster re-reads the settings so edits made
// from the admin console reach all instances.
const reloadInterval = 30 * time.Second

const (
	NamespaceBilling = "billing"
	NamespaceLimits  = "limits"
	NamespaceDiscord = "discord"
	NamespaceEngine  = "engine"
	NamespaceAI      = "ai"
)

// Billing configures checkout and the SePay integration. Hot reloaded.
type Billing struct {
	WebhookHMACSecret       string `json:"webhook_hmac_secret"`
	TransferCodePrefix      string `json:"transfer_code_prefix"`
	MerchantBankName        string `json:"merchant_bank_name"`
	MerchantAccountNo       string `json:"merchant_account_no"`
	CheckoutTTLMinutes      int    `json:"checkout_ttl_minutes"`
	SePayMerchantID         string `json:"sepay_merchant_id"`
	SePaySecretKey          string `json:"sepay_secret_key"`
	SePayCheckoutBaseURL    string `json:"sepay_checkout_base_url"`
	SePayAPIBaseURL         string `json:"sepay_api_base_url"`
	SePayBearerToken        string `json:"sepay_bearer_token"`
	SePayBankAccountXID     string `json:"sepay_bank_account_xid"`
	SePayVaPrefix           string `json:"sepay_va_prefix"`
	SePayQRCodeTemplate     string `json:"sepay_qrcode_template"`
	SePayWithQRCode         bool   `json:"sepay_with_qrcode"`
	SePayCheckoutTTLMinutes int    `json:"sepay_checkout_ttl_minutes"`
}

// Limits are the per-user limits. Hot reloaded.
type Limits struct {
	MaxAppsPerUser int `json:"max_apps_per_user"`
	MaxAssetSize   int `json:"max_asset_size"`
}

// Discord holds the credentials used to hand out plan roles. Hot reloaded.
type Discord struct {
	BotToken string `json:"bot_token"`
	GuildID  string `json:"guild_id"`
}

// Engine holds the flow execution limits. Read at startup (restart to apply).
type Engine struct {
	MaxStackDepth               int `json:"max_stack_depth"`
	MaxOperations               int `json:"max_operations"`
	MaxCredits                  int `json:"max_credits"`
	ComponentResumePointTTLDays int `json:"component_resume_point_ttl_days"`
}

// AI declares the providers and models offered in flow AI nodes. Read at
// startup (restart to apply); kite-ai-service polls the model list.
type AI struct {
	DefaultModel string       `json:"default_model"`
	Providers    []AIProvider `json:"providers"`
}

type AIProvider struct {
	ID      string    `json:"id"`
	API     string    `json:"api"`
	BaseURL string    `json:"base_url"`
	APIKey  string    `json:"api_key"`
	Models  []AIModel `json:"models"`
}

type AIModel struct {
	Key     string `json:"key"`
	Name    string `json:"name"`
	Model   string `json:"model"`
	Credits int    `json:"credits"`
}

// Snapshot is an immutable view of all settings. Treat it as read-only.
type Snapshot struct {
	Billing Billing
	Limits  Limits
	Discord Discord
	Engine  Engine
	AI      AI
}

type namespace struct {
	name string
	// secrets lists the keys whose values are encrypted at rest.
	secrets []string
	ptr     func(*Snapshot) any
}

var namespaces = []namespace{
	{NamespaceBilling, []string{"webhook_hmac_secret", "sepay_secret_key", "sepay_bearer_token"}, func(s *Snapshot) any { return &s.Billing }},
	{NamespaceLimits, nil, func(s *Snapshot) any { return &s.Limits }},
	{NamespaceDiscord, []string{"bot_token"}, func(s *Snapshot) any { return &s.Discord }},
	{NamespaceEngine, nil, func(s *Snapshot) any { return &s.Engine }},
	// Provider API keys are nested inside the providers array, they are
	// encrypted individually by encryptAIKeys / decryptAIKeys.
	{NamespaceAI, nil, func(s *Snapshot) any { return &s.AI }},
}

func (n namespace) isSecret(key string) bool {
	return slices.Contains(n.secrets, key)
}

type Manager struct {
	store store.SettingStore
	crypt *util.SymmetricCrypt

	mu   sync.RWMutex
	snap Snapshot
}

// NewManager loads the settings. Every namespace that has no rows yet is seeded
// from seed (built from the legacy kite.toml values), after which the database
// is the only source of truth for it.
func NewManager(ctx context.Context, settingStore store.SettingStore, crypt *util.SymmetricCrypt, seed Snapshot) (*Manager, error) {
	m := &Manager{store: settingStore, crypt: crypt}

	rows, err := settingStore.Settings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load settings: %w", err)
	}

	existing := make(map[string]bool)
	for _, row := range rows {
		existing[row.Namespace] = true
	}

	seeded := seed
	for _, ns := range namespaces {
		if existing[ns.name] {
			continue
		}
		if err := m.saveNamespace(ctx, ns, ns.ptr(&seeded), "system:seed"); err != nil {
			return nil, fmt.Errorf("failed to seed settings %q: %w", ns.name, err)
		}
		slog.Info("Seeded settings from config file into the database", slog.String("namespace", ns.name))
	}

	if err := m.Reload(ctx); err != nil {
		return nil, err
	}
	return m, nil
}

// Snapshot returns the current settings.
func (m *Manager) Snapshot() Snapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.snap
}

func (m *Manager) Billing() Billing { return m.Snapshot().Billing }
func (m *Manager) Limits() Limits   { return m.Snapshot().Limits }
func (m *Manager) Discord() Discord { return m.Snapshot().Discord }
func (m *Manager) Engine() Engine   { return m.Snapshot().Engine }
func (m *Manager) AI() AI           { return m.Snapshot().AI }

// Reload re-reads every namespace from the database.
func (m *Manager) Reload(ctx context.Context) error {
	rows, err := m.store.Settings(ctx)
	if err != nil {
		return fmt.Errorf("failed to load settings: %w", err)
	}

	byNamespace := make(map[string]map[string]json.RawMessage)
	for _, row := range rows {
		values := byNamespace[row.Namespace]
		if values == nil {
			values = make(map[string]json.RawMessage)
			byNamespace[row.Namespace] = values
		}

		value := json.RawMessage(row.Value)
		if row.IsSecret {
			plain, err := m.decryptValue(row.Value)
			if err != nil {
				return fmt.Errorf("failed to decrypt setting %s.%s: %w", row.Namespace, row.Key, err)
			}
			value = plain
		}
		values[row.Key] = value
	}

	var snap Snapshot
	for _, ns := range namespaces {
		values, ok := byNamespace[ns.name]
		if !ok {
			continue
		}
		raw, err := json.Marshal(values)
		if err != nil {
			return err
		}
		if err := json.Unmarshal(raw, ns.ptr(&snap)); err != nil {
			return fmt.Errorf("invalid settings %q: %w", ns.name, err)
		}
	}
	if err := m.decryptAIKeys(&snap.AI); err != nil {
		return err
	}

	m.mu.Lock()
	m.snap = snap
	m.mu.Unlock()
	return nil
}

// RunReload keeps the settings fresh. It must run on every cluster.
func (m *Manager) RunReload(ctx context.Context) {
	ticker := time.NewTicker(reloadInterval)

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := m.Reload(ctx); err != nil {
					slog.With("error", err).Error("failed to reload settings")
				}
			}
		}
	}()
}

// Save writes one namespace (value must be a pointer or value of the matching
// type, e.g. Billing) and reloads the settings.
func (m *Manager) Save(ctx context.Context, name string, value any, updatedBy string) error {
	for _, ns := range namespaces {
		if ns.name != name {
			continue
		}
		if err := m.saveNamespace(ctx, ns, value, updatedBy); err != nil {
			return err
		}
		return m.Reload(ctx)
	}
	return fmt.Errorf("unknown settings namespace %q", name)
}

func (m *Manager) saveNamespace(ctx context.Context, ns namespace, value any, updatedBy string) error {
	switch ai := value.(type) {
	case *AI:
		sealed, err := m.encryptAIKeys(*ai)
		if err != nil {
			return err
		}
		value = &sealed
	case AI:
		sealed, err := m.encryptAIKeys(ai)
		if err != nil {
			return err
		}
		value = &sealed
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return fmt.Errorf("settings %q must be an object: %w", ns.name, err)
	}

	for key, val := range fields {
		secret := ns.isSecret(key)
		stored := []byte(val)
		if secret {
			stored, err = m.encryptValue(val)
			if err != nil {
				return fmt.Errorf("failed to encrypt %s.%s: %w", ns.name, key, err)
			}
		}
		if err := m.store.SaveSetting(ctx, store.Setting{
			Namespace: ns.name, Key: key, Value: stored, IsSecret: secret,
		}, updatedBy); err != nil {
			return err
		}
	}
	return nil
}

// encryptValue turns a JSON value into a JSON string holding its ciphertext.
// Empty strings stay empty so "unset" is distinguishable from a stored secret.
func (m *Manager) encryptValue(val json.RawMessage) ([]byte, error) {
	var plain string
	if err := json.Unmarshal(val, &plain); err != nil {
		return nil, fmt.Errorf("secret must be a string: %w", err)
	}
	if plain == "" {
		return json.Marshal("")
	}
	sealed, err := m.seal(plain)
	if err != nil {
		return nil, err
	}
	return json.Marshal(sealed)
}

func (m *Manager) decryptValue(stored []byte) (json.RawMessage, error) {
	var sealed string
	if err := json.Unmarshal(stored, &sealed); err != nil {
		return nil, err
	}
	plain, err := m.open(sealed)
	if err != nil {
		return nil, err
	}
	return json.Marshal(plain)
}

func (m *Manager) seal(plain string) (string, error) {
	if plain == "" {
		return "", nil
	}
	enc, err := m.crypt.Encrypt([]byte(plain))
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(enc), nil
}

func (m *Manager) open(sealed string) (string, error) {
	if sealed == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		return "", err
	}
	plain, err := m.crypt.Decrypt(raw)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

func (m *Manager) encryptAIKeys(ai AI) (AI, error) {
	providers := make([]AIProvider, len(ai.Providers))
	copy(providers, ai.Providers)
	for i := range providers {
		sealed, err := m.seal(providers[i].APIKey)
		if err != nil {
			return ai, fmt.Errorf("failed to encrypt API key of AI provider %q: %w", providers[i].ID, err)
		}
		providers[i].APIKey = sealed
	}
	ai.Providers = providers
	return ai, nil
}

func (m *Manager) decryptAIKeys(ai *AI) error {
	providers := make([]AIProvider, len(ai.Providers))
	copy(providers, ai.Providers)
	for i := range providers {
		key, err := m.open(providers[i].APIKey)
		if err != nil {
			return fmt.Errorf("failed to decrypt API key of AI provider %q: %w", providers[i].ID, err)
		}
		providers[i].APIKey = key
	}
	ai.Providers = providers
	return nil
}
