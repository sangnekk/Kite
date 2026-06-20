package config

import "github.com/go-playground/validator/v10"

type Config struct {
	Logging    LoggingConfig    `toml:"logging"`
	Database   DatabaseConfig   `toml:"database"`
	API        APIConfig        `toml:"api"`
	App        AppConfig        `toml:"app"`
	UserLimits UserLimitsConfig `toml:"user_limits"`
	Discord    DiscordConfig    `toml:"discord"`
	Engine     EngineConfig     `toml:"engine"`
	OpenAI     OpenAIConfig     `toml:"openai"`
	AI         AIConfig         `toml:"ai"`
	Billing    BillingConfig    `toml:"billing"`
	Encryption EncryptionConfig `toml:"encryption"`

	ClusterCount int `toml:"cluster_count"`
	ClusterIndex int `toml:"cluster_index"`
}

func (cfg *Config) Validate() error {
	validate := validator.New(validator.WithRequiredStructEnabled())
	return validate.Struct(cfg)
}

func (cfg *Config) IsPrimaryCluster() bool {
	return cfg.ClusterIndex == 0
}

func LoadConfig(basePath string) (*Config, error) {
	return loadConfig[*Config](basePath)
}

type DatabaseConfig struct {
	Postgres PostgresConfig `toml:"postgres"`
	S3       S3Config       `toml:"s3"`
}

type LoggingConfig struct {
	Filename   string `toml:"filename"`
	MaxSize    int    `toml:"max_size"`
	MaxAge     int    `toml:"max_age"`
	MaxBackups int    `toml:"max_backups"`
}

type PostgresConfig struct {
	Host     string `toml:"host" validate:"required"`
	Port     int    `toml:"port" validate:"required"`
	DBName   string `toml:"db_name" validate:"required"`
	User     string `toml:"user" validate:"required"`
	Password string `toml:"password"`
}

type S3Config struct {
	Endpoint        string `toml:"endpoint" validate:"required"`
	AccessKeyID     string `toml:"access_key_id" validate:"required"`
	SecretAccessKey string `toml:"secret_access_key" validate:"required"`
	Secure          bool   `toml:"secure"`
	SSECKey         string `toml:"ssec_key"`
}

type APIConfig struct {
	Host          string `toml:"host" validate:"required"`
	Port          int    `toml:"port" validate:"required"`
	PublicBaseURL string `toml:"public_base_url" validate:"required"`
	SecureCookies bool   `toml:"secure_cookies"`
	StrictCookies bool   `toml:"strict_cookies"`
}

type AppConfig struct {
	PublicBaseURL string `toml:"public_base_url" validate:"required"`
	// AllowedOrigins lists additional origins (besides PublicBaseURL) that are
	// permitted to make cross-origin browser requests to the API, e.g. a docs
	// site hosted on a separate subdomain.
	AllowedOrigins []string `toml:"allowed_origins"`
}

type EncryptionConfig struct {
	TokenEncryptionKey string `toml:"token_encryption_key" validate:"required"`
}

type DiscordConfig struct {
	ClientID     string `toml:"client_id" validate:"required"`
	ClientSecret string `toml:"client_secret" validate:"required"`
	// BotToken is used to hand out roles to users
	BotToken string `toml:"bot_token"`
	// GuildID is the ID of the guild to hand out roles to users
	GuildID  string `toml:"guild_id"`
	ProxyURL string `toml:"proxy_url"`
}

type EngineConfig struct {
	MaxStackDepth int    `toml:"max_stack_depth"`
	MaxOperations int    `toml:"max_operations"`
	MaxCredits    int    `toml:"max_credits"`
	HTTPProxyURL  string `toml:"http_proxy_url"`
}

type UserLimitsConfig struct {
	MaxAppsPerUser int `toml:"max_apps_per_user"`
	MaxAssetSize   int `toml:"max_asset_size"`
}

type OpenAIConfig struct {
	APIKey string `toml:"api_key"`
}

// AIConfig configures the AI providers and the models users can pick in flows.
// Each provider speaks one wire protocol (openai or anthropic) and exposes one
// or more manually declared models. Providers without an api_key are skipped at
// startup, so their models never appear in the model picker.
type AIConfig struct {
	// DefaultModel is the model key used when a flow node leaves the model
	// empty. Falls back to the first available model when unset or unavailable.
	DefaultModel string             `toml:"default_model"`
	Providers    []AIProviderConfig `toml:"provider" validate:"dive"`
}

type AIProviderConfig struct {
	// ID uniquely identifies the provider and links its models to it.
	ID string `toml:"id" validate:"required"`
	// API is the wire protocol: "openai" (also covers OpenAI-compatible
	// gateways like OpenRouter/Groq/vLLM via base_url) or "anthropic".
	API string `toml:"api" validate:"required,oneof=openai anthropic"`
	// BaseURL overrides the upstream endpoint. Empty uses the official one.
	BaseURL string          `toml:"base_url"`
	APIKey  string          `toml:"api_key"`
	Models  []AIModelConfig `toml:"model" validate:"dive"`
}

type AIModelConfig struct {
	// Key is the stable identifier stored in flow data and shown as the
	// dropdown value. Decoupled from Model so spelling/provider can change.
	Key string `toml:"key" validate:"required"`
	// Name is the human-friendly label shown to no-code users.
	Name string `toml:"name" validate:"required"`
	// Model is the exact model spelling sent to the upstream API.
	Model string `toml:"model" validate:"required"`
	// Credits is the base cost charged per chat completion with this model.
	Credits int `toml:"credits"`
}

type BillingConfig struct {
	WebhookHMACSecret       string              `toml:"webhook_hmac_secret"`
	TransferCodePrefix      string              `toml:"transfer_code_prefix"`
	MerchantBankName        string              `toml:"merchant_bank_name"`
	MerchantAccountNo       string              `toml:"merchant_account_no"`
	CheckoutTTLMinutes      int                 `toml:"checkout_ttl_minutes"`
	SePayMerchantID         string              `toml:"sepay_merchant_id"`
	SePaySecretKey          string              `toml:"sepay_secret_key"`
	SePayCheckoutBaseURL    string              `toml:"sepay_checkout_base_url"`
	SePayAPIBaseURL         string              `toml:"sepay_api_base_url"`
	SePayBearerToken        string              `toml:"sepay_bearer_token"`
	SePayBankAccountXID     string              `toml:"sepay_bank_account_xid"`
	SePayVaPrefix           string              `toml:"sepay_va_prefix"`
	SePayQRCodeTemplate     string              `toml:"sepay_qrcode_template"`
	SePayWithQRCode         bool                `toml:"sepay_with_qrcode"`
	SePayCheckoutTTLMinutes int                 `toml:"sepay_checkout_ttl_minutes"`
	Plans                   []BillingPlanConfig `toml:"plans"`
}

type BillingPlanConfig struct {
	ID                  string  `toml:"id" validate:"required"`
	Title               string  `toml:"title" validate:"required"`
	Description         string  `toml:"description" validate:"required"`
	Price               float32 `toml:"price" validate:"required"`
	PaymentAmount       int     `toml:"payment_amount"`
	PremiumDurationDays int     `toml:"premium_duration_days"`
	Default             bool    `toml:"default"`
	Popular             bool    `toml:"popular"`
	Hidden              bool    `toml:"hidden"`

	LemonSqueezyProductID string `toml:"lemonsqueezy_product_id"`
	LemonSqueezyVariantID string `toml:"lemonsqueezy_variant_id"`

	DiscordRoleID string `toml:"discord_role_id"`

	FeatureMaxCollaborators     int  `toml:"feature_max_collaborators"`
	FeatureUsageCreditsPerMonth int  `toml:"feature_usage_credits_per_month"`
	FeatureMaxGuilds            int  `toml:"feature_max_guilds"`
	FeatureMaxCommands          int  `toml:"feature_max_commands"`
	FeatureMaxVariables         int  `toml:"feature_max_variables"`
	FeatureMaxMessages          int  `toml:"feature_max_messages"`
	FeatureMaxEventListeners    int  `toml:"feature_max_event_listeners"`
	FeaturePrioritySupport      bool `toml:"feature_priority_support"`
	FeatureCustomBotStatus      bool `toml:"feature_custom_bot_status"`
	FeatureAIIncluded           bool `toml:"feature_ai_included"`
	FeatureAICreditPerDay       int  `toml:"feature_ai_credit_per_day"`
}
