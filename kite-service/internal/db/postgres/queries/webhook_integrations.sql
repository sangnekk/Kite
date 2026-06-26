-- name: GetWebhookIntegrationsByApp :many
SELECT id, app_id, type, secret, enabled, created_at, updated_at
FROM webhook_integrations WHERE app_id = $1 ORDER BY created_at DESC;

-- name: GetWebhookIntegration :one
SELECT id, app_id, type, secret, enabled, created_at, updated_at
FROM webhook_integrations WHERE id = $1;

-- name: CreateWebhookIntegration :one
INSERT INTO webhook_integrations (
    id, app_id, type, secret, enabled, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING id, app_id, type, secret, enabled, created_at, updated_at;

-- name: UpdateWebhookIntegration :one
UPDATE webhook_integrations SET
    secret = $2,
    enabled = $3,
    updated_at = $4
WHERE id = $1 RETURNING id, app_id, type, secret, enabled, created_at, updated_at;

-- name: DeleteWebhookIntegration :exec
DELETE FROM webhook_integrations WHERE id = $1;
