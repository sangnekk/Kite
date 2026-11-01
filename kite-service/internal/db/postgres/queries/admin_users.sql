-- name: ListAdminUsers :many
SELECT * FROM admin_users ORDER BY created_at;

-- name: GetAdminUser :one
SELECT * FROM admin_users WHERE discord_id = $1;

-- name: UpsertAdminUser :exec
INSERT INTO admin_users (discord_id, role, added_by)
VALUES ($1, $2, $3)
ON CONFLICT (discord_id) DO UPDATE SET role = EXCLUDED.role;

-- name: DeleteAdminUser :exec
DELETE FROM admin_users WHERE discord_id = $1;

-- name: CreateAdminAuditLog :exec
INSERT INTO admin_audit_log (actor_discord_id, action, target, detail)
VALUES ($1, $2, $3, $4);

-- name: ListAdminAuditLog :many
SELECT * FROM admin_audit_log ORDER BY id DESC LIMIT $1 OFFSET $2;
