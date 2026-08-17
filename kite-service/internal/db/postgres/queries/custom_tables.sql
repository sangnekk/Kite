-- name: GetCustomTable :one
SELECT * FROM custom_tables WHERE id = $1;

-- name: GetCustomTablesByApp :many
SELECT * FROM custom_tables WHERE app_id = $1 ORDER BY name ASC;

-- name: CreateCustomTable :one
INSERT INTO custom_tables (id, app_id, name, description, scope, schema, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateCustomTable :one
UPDATE custom_tables
SET name = $2, description = $3, scope = $4, schema = $5, updated_at = $6
WHERE id = $1
RETURNING *;

-- name: DeleteCustomTable :execrows
DELETE FROM custom_tables WHERE id = $1;
