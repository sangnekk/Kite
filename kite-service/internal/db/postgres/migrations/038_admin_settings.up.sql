-- Subscription plans, previously declared in kite.toml ([[billing.plans]]).
-- Plans are archived instead of deleted because entitlements and payment
-- sessions reference them by id.
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    payment_amount INTEGER NOT NULL DEFAULT 0,
    premium_duration_days INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    popular BOOLEAN NOT NULL DEFAULT FALSE,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    lemonsqueezy_product_id TEXT NOT NULL DEFAULT '',
    lemonsqueezy_variant_id TEXT NOT NULL DEFAULT '',
    discord_role_id TEXT NOT NULL DEFAULT '',

    feature_max_collaborators INTEGER NOT NULL DEFAULT 0,
    feature_usage_credits_per_month INTEGER NOT NULL DEFAULT 0,
    feature_max_guilds INTEGER NOT NULL DEFAULT 0,
    feature_max_commands INTEGER NOT NULL DEFAULT 0,
    feature_max_variables INTEGER NOT NULL DEFAULT 0,
    feature_max_custom_tables INTEGER NOT NULL DEFAULT 0,
    feature_max_custom_events INTEGER NOT NULL DEFAULT 0,
    feature_max_messages INTEGER NOT NULL DEFAULT 0,
    feature_max_event_listeners INTEGER NOT NULL DEFAULT 0,
    feature_max_schedules INTEGER NOT NULL DEFAULT 0,
    feature_priority_support BOOLEAN NOT NULL DEFAULT FALSE,
    feature_custom_bot_status BOOLEAN NOT NULL DEFAULT FALSE,
    feature_ai_included BOOLEAN NOT NULL DEFAULT FALSE,
    feature_ai_credit_per_day INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- At most one default plan can exist.
CREATE UNIQUE INDEX IF NOT EXISTS plans_single_default ON plans (is_default) WHERE is_default;

-- Runtime settings edited from the admin console, grouped by namespace
-- (billing, ai, discord, limits, engine). Values flagged as secret hold a
-- base64 AES-GCM ciphertext (the key lives in kite.toml, never in the database).
CREATE TABLE IF NOT EXISTS settings (
    namespace TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    PRIMARY KEY (namespace, key)
);

-- Admin console staff, keyed by Discord ID so they can be added before their
-- first login. The system owner is NOT stored here, it comes from kite.toml.
CREATE TABLE IF NOT EXISTS admin_users (
    discord_id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
    added_by TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_discord_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    detail JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at ON admin_audit_log (created_at DESC);
