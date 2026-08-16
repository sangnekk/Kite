-- name: GetSchedule :one
SELECT * FROM schedules WHERE id = $1;

-- name: GetSchedulesByApp :many
SELECT * FROM schedules WHERE app_id = $1 ORDER BY created_at DESC;

-- name: CountSchedulesByApp :one
SELECT COUNT(*) FROM schedules WHERE app_id = $1;

-- name: CreateSchedule :one
INSERT INTO schedules (
    id,
    app_id,
    module_id,
    creator_user_id,
    enabled,
    description,
    trigger_type,
    interval_seconds,
    cron_expression,
    timezone,
    next_run_at,
    last_run_at,
    flow_source,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: UpdateSchedule :one
UPDATE schedules SET
    enabled = $2,
    description = $3,
    trigger_type = $4,
    interval_seconds = $5,
    cron_expression = $6,
    timezone = $7,
    next_run_at = $8,
    flow_source = $9,
    updated_at = $10
WHERE id = $1 RETURNING *;

-- name: DeleteSchedule :exec
DELETE FROM schedules WHERE id = $1;

-- name: GetDueSchedules :many
SELECT sqlc.embed(schedules) FROM schedules
JOIN apps ON apps.id = schedules.app_id
WHERE schedules.enabled = TRUE
    AND apps.enabled = TRUE
    AND schedules.next_run_at IS NOT NULL
    AND schedules.next_run_at <= $1;

-- name: ClaimSchedule :execrows
UPDATE schedules SET
    next_run_at = @next_run_at,
    last_run_at = @now
WHERE id = @id
    AND enabled = TRUE
    AND next_run_at IS NOT NULL
    AND next_run_at <= @now;
