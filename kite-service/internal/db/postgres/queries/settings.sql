-- name: ListSettings :many
SELECT * FROM settings;

-- name: UpsertSetting :exec
INSERT INTO settings (namespace, key, value, is_secret, updated_by, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (namespace, key) DO UPDATE SET
    value = EXCLUDED.value,
    is_secret = EXCLUDED.is_secret,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

-- name: CountSettings :one
SELECT COUNT(*) FROM settings;
