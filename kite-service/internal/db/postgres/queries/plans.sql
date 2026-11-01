-- name: ListPlans :many
SELECT * FROM plans ORDER BY sort_order, id;

-- name: CountPlans :one
SELECT COUNT(*) FROM plans;

-- name: UpsertPlan :exec
INSERT INTO plans (
    id, title, description, price, payment_amount, premium_duration_days,
    is_default, popular, hidden, archived, sort_order,
    lemonsqueezy_product_id, lemonsqueezy_variant_id, discord_role_id,
    feature_max_collaborators, feature_usage_credits_per_month, feature_max_guilds,
    feature_max_commands, feature_max_variables, feature_max_custom_tables,
    feature_max_custom_events, feature_max_messages, feature_max_event_listeners,
    feature_max_schedules, feature_priority_support, feature_custom_bot_status,
    feature_ai_included, feature_ai_credit_per_day, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
    $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    payment_amount = EXCLUDED.payment_amount,
    premium_duration_days = EXCLUDED.premium_duration_days,
    is_default = EXCLUDED.is_default,
    popular = EXCLUDED.popular,
    hidden = EXCLUDED.hidden,
    archived = EXCLUDED.archived,
    sort_order = EXCLUDED.sort_order,
    lemonsqueezy_product_id = EXCLUDED.lemonsqueezy_product_id,
    lemonsqueezy_variant_id = EXCLUDED.lemonsqueezy_variant_id,
    discord_role_id = EXCLUDED.discord_role_id,
    feature_max_collaborators = EXCLUDED.feature_max_collaborators,
    feature_usage_credits_per_month = EXCLUDED.feature_usage_credits_per_month,
    feature_max_guilds = EXCLUDED.feature_max_guilds,
    feature_max_commands = EXCLUDED.feature_max_commands,
    feature_max_variables = EXCLUDED.feature_max_variables,
    feature_max_custom_tables = EXCLUDED.feature_max_custom_tables,
    feature_max_custom_events = EXCLUDED.feature_max_custom_events,
    feature_max_messages = EXCLUDED.feature_max_messages,
    feature_max_event_listeners = EXCLUDED.feature_max_event_listeners,
    feature_max_schedules = EXCLUDED.feature_max_schedules,
    feature_priority_support = EXCLUDED.feature_priority_support,
    feature_custom_bot_status = EXCLUDED.feature_custom_bot_status,
    feature_ai_included = EXCLUDED.feature_ai_included,
    feature_ai_credit_per_day = EXCLUDED.feature_ai_credit_per_day,
    updated_at = EXCLUDED.updated_at;

-- name: ClearDefaultPlan :exec
UPDATE plans SET is_default = FALSE WHERE is_default AND id <> $1;
