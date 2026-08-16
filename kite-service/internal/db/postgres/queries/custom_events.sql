-- name: GetCustomEvent :one
SELECT * FROM custom_events WHERE id = $1;

-- name: GetCustomEventsByApp :many
SELECT * FROM custom_events WHERE app_id = $1 ORDER BY name ASC;

-- name: CreateCustomEvent :one
INSERT INTO custom_events (id, app_id, name, description, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateCustomEvent :one
UPDATE custom_events
SET name = $2, description = $3, updated_at = $4
WHERE id = $1
RETURNING *;

-- name: DeleteCustomEvent :execrows
DELETE FROM custom_events WHERE id = $1;
