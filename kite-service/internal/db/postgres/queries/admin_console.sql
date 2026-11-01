-- Read/write queries behind the admin console. Search patterns are built (and
-- LIKE-escaped) in Go; an empty search becomes '%%' which matches everything.
-- discord_token is deliberately never selected here.

-- ---------------------------------------------------------------- users

-- name: AdminListUsers :many
SELECT
    u.id, u.email, u.display_name, u.discord_id, u.discord_username, u.discord_avatar,
    u.created_at, u.updated_at,
    (SELECT COUNT(*) FROM apps a WHERE a.owner_user_id = u.id)::int AS apps_count,
    COALESCE((
        SELECT s.display_name FROM subscriptions s
        WHERE s.user_id = u.id AND s.status IN ('active', 'on_trial')
        ORDER BY s.created_at DESC LIMIT 1
    ), 'free')::text AS plan
FROM users u
WHERE u.email ILIKE sqlc.arg(pattern)::text OR u.discord_username ILIKE sqlc.arg(pattern)::text
ORDER BY u.created_at DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountUsers :one
SELECT COUNT(*) FROM users u
WHERE u.email ILIKE sqlc.arg(pattern)::text OR u.discord_username ILIKE sqlc.arg(pattern)::text;

-- name: AdminGetUser :one
SELECT
    u.id, u.email, u.display_name, u.discord_id, u.discord_username, u.discord_avatar,
    u.created_at, u.updated_at,
    (SELECT COUNT(*) FROM apps a WHERE a.owner_user_id = u.id)::int AS apps_count,
    COALESCE((
        SELECT s.display_name FROM subscriptions s
        WHERE s.user_id = u.id AND s.status IN ('active', 'on_trial')
        ORDER BY s.created_at DESC LIMIT 1
    ), 'free')::text AS plan
FROM users u WHERE u.id = $1;

-- name: AdminActiveSubscriptionOfUser :one
SELECT id, status, display_name, renews_at, ends_at
FROM subscriptions
WHERE user_id = $1 AND status IN ('active', 'on_trial')
ORDER BY created_at DESC LIMIT 1;

-- name: AdminAppsOfUser :many
SELECT id, name, enabled, created_at FROM apps WHERE owner_user_id = $1 ORDER BY created_at DESC;

-- name: AdminDeleteUserSessions :execrows
DELETE FROM sessions WHERE user_id = $1;

-- ---------------------------------------------------------------- apps

-- name: AdminListApps :many
SELECT
    a.id, a.name, a.owner_user_id, a.enabled, a.discord_status, a.disabled_reason, a.created_at,
    o.email AS owner_email,
    COALESCE((SELECT SUM(ur.credits_used) FROM usage_records ur WHERE ur.app_id = a.id), 0)::bigint AS credits_used,
    (SELECT COUNT(*) FROM collaborators c WHERE c.app_id = a.id)::int AS collaborators_count
FROM apps a
LEFT JOIN users o ON o.id = a.owner_user_id
WHERE a.name ILIKE sqlc.arg(pattern)::text
ORDER BY a.created_at DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountApps :one
SELECT COUNT(*) FROM apps a WHERE a.name ILIKE sqlc.arg(pattern)::text;

-- name: AdminGetApp :one
SELECT
    a.id, a.name, a.description, a.owner_user_id, a.creator_user_id, a.enabled,
    a.discord_id, a.discord_status, a.disabled_reason, a.created_at, a.updated_at,
    o.email AS owner_email,
    COALESCE((SELECT SUM(ur.credits_used) FROM usage_records ur WHERE ur.app_id = a.id), 0)::bigint AS credits_used,
    (SELECT COUNT(*) FROM resume_points rp WHERE rp.app_id = a.id)::int AS resume_points_count
FROM apps a
LEFT JOIN users o ON o.id = a.owner_user_id
WHERE a.id = $1;

-- name: AdminCollaboratorsOfApp :many
SELECT user_id, role FROM collaborators WHERE app_id = $1 ORDER BY created_at;

-- name: AdminSetAppEnabled :execrows
UPDATE apps SET enabled = $2, disabled_reason = $3, updated_at = $4 WHERE id = $1;

-- name: AdminDeleteResumePointsOfApp :execrows
DELETE FROM resume_points WHERE app_id = $1;

-- ---------------------------------------------------------------- billing

-- name: AdminListSubscriptions :many
SELECT
    s.id, s.user_id, s.display_name, s.source, s.status, s.renews_at, s.trial_ends_at, s.ends_at, s.created_at,
    u.email AS user_email
FROM subscriptions s
LEFT JOIN users u ON u.id = s.user_id
WHERE (sqlc.arg(status)::text = '' OR s.status = sqlc.arg(status)::text)
  AND COALESCE(u.email, '') ILIKE sqlc.arg(pattern)::text
ORDER BY s.created_at DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountSubscriptions :one
SELECT COUNT(*) FROM subscriptions s
LEFT JOIN users u ON u.id = s.user_id
WHERE (sqlc.arg(status)::text = '' OR s.status = sqlc.arg(status)::text)
  AND COALESCE(u.email, '') ILIKE sqlc.arg(pattern)::text;

-- name: AdminSetSubscriptionStatus :execrows
UPDATE subscriptions SET status = $2, status_formatted = $3, ends_at = COALESCE($4, ends_at), updated_at = $5
WHERE id = $1;

-- name: AdminEndEntitlementsOfSubscription :exec
UPDATE entitlements SET ends_at = $2, updated_at = $2
WHERE subscription_id = $1 AND (ends_at IS NULL OR ends_at > $2);

-- name: AdminListEntitlements :many
SELECT e.id, e.type, e.app_id, e.subscription_id, e.plan_id, e.ends_at, e.created_at, a.name AS app_name
FROM entitlements e
LEFT JOIN apps a ON a.id = e.app_id
ORDER BY e.created_at DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountEntitlements :one
SELECT COUNT(*) FROM entitlements;

-- name: AdminCreateManualEntitlement :exec
INSERT INTO entitlements (id, type, subscription_id, app_id, plan_id, created_at, updated_at, ends_at)
VALUES ($1, 'manual', NULL, $2, $3, $4, $4, $5);

-- name: AdminDeleteEntitlement :execrows
DELETE FROM entitlements WHERE id = $1;

-- name: AdminListPaymentSessions :many
SELECT
    p.id, p.payment_id, p.app_id, p.plan_id, p.provider, p.amount, p.status, p.paid_at, p.created_at,
    a.name AS app_name
FROM payment_sessions p
LEFT JOIN apps a ON a.id = p.app_id
WHERE (sqlc.arg(status)::text = '' OR p.status = sqlc.arg(status)::text)
ORDER BY p.created_at DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountPaymentSessions :one
SELECT COUNT(*) FROM payment_sessions p
WHERE (sqlc.arg(status)::text = '' OR p.status = sqlc.arg(status)::text);

-- name: AdminPaymentSessionPaymentID :one
SELECT payment_id FROM payment_sessions WHERE id = $1;

-- name: AdminCancelPendingPaymentSession :execrows
UPDATE payment_sessions SET status = $2, updated_at = $3 WHERE id = $1 AND status = 'pending';

-- ---------------------------------------------------------------- logs

-- name: AdminListLogs :many
SELECT
    l.id, l.app_id, l.message, l.level, l.command_id, l.event_listener_id, l.message_id, l.created_at,
    a.name AS app_name
FROM logs l
LEFT JOIN apps a ON a.id = l.app_id
WHERE (sqlc.arg(level)::text = '' OR l.level = sqlc.arg(level)::text)
  AND (sqlc.arg(app_id)::text = '' OR l.app_id = sqlc.arg(app_id)::text)
  AND l.message ILIKE sqlc.arg(pattern)::text
ORDER BY l.created_at DESC, l.id DESC
LIMIT sqlc.arg(page_size)::int OFFSET sqlc.arg(page_offset)::int;

-- name: AdminCountLogs :one
SELECT COUNT(*) FROM logs l
WHERE (sqlc.arg(level)::text = '' OR l.level = sqlc.arg(level)::text)
  AND (sqlc.arg(app_id)::text = '' OR l.app_id = sqlc.arg(app_id)::text)
  AND l.message ILIKE sqlc.arg(pattern)::text;

-- name: AdminLogApps :many
SELECT id, name FROM apps ORDER BY name;

-- ---------------------------------------------------------------- dashboard

-- name: AdminDashboardStats :one
SELECT
    (SELECT COUNT(*) FROM users)::bigint AS total_users,
    (SELECT COUNT(*) FROM apps)::bigint AS total_apps,
    (SELECT COUNT(*) FROM apps WHERE enabled)::bigint AS active_apps,
    (SELECT COUNT(*) FROM logs WHERE level = 'error' AND created_at >= sqlc.arg(since_24h)::timestamp)::bigint AS errors_24h,
    (SELECT COUNT(*) FROM logs WHERE level = 'error' AND created_at >= sqlc.arg(since_48h)::timestamp AND created_at < sqlc.arg(since_24h)::timestamp)::bigint AS errors_prev_24h,
    COALESCE((SELECT SUM(credits_used) FROM usage_records), 0)::bigint AS total_credits,
    (SELECT COUNT(*) FROM subscriptions WHERE status IN ('active', 'on_trial'))::bigint AS active_subscriptions;

-- name: AdminUsageByDay :many
SELECT date_trunc('day', created_at)::timestamp AS day, COALESCE(SUM(credits_used), 0)::bigint AS credits
FROM usage_records WHERE created_at >= $1 GROUP BY 1 ORDER BY 1;

-- name: AdminErrorsByDay :many
SELECT date_trunc('day', created_at)::timestamp AS day, COUNT(*)::bigint AS errors
FROM logs WHERE level = 'error' AND created_at >= $1 GROUP BY 1 ORDER BY 1;

-- name: AdminRecentLogs :many
SELECT l.id, l.app_id, l.message, l.level, l.created_at, a.name AS app_name
FROM logs l
LEFT JOIN apps a ON a.id = l.app_id
ORDER BY l.created_at DESC, l.id DESC
LIMIT 10;

-- ---------------------------------------------------------------- revenue

-- name: AdminRevenueTotals :one
SELECT COALESCE(SUM(amount), 0)::bigint AS total, COUNT(*)::bigint AS count
FROM payment_sessions
WHERE status = 'paid' AND paid_at >= sqlc.arg(range_start)::timestamp AND paid_at < sqlc.arg(range_end)::timestamp;

-- name: AdminRevenueChart :many
SELECT date_trunc(sqlc.arg(unit)::text, paid_at)::timestamp AS bucket,
       COALESCE(SUM(amount), 0)::bigint AS total, COUNT(*)::bigint AS count
FROM payment_sessions
WHERE status = 'paid' AND paid_at >= sqlc.arg(range_start)::timestamp
GROUP BY 1 ORDER BY 1;

-- name: AdminSubscriptionStatusCounts :many
SELECT status, COUNT(*)::bigint AS count FROM subscriptions GROUP BY status;
