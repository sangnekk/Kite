ALTER TABLE app_settings DROP COLUMN IF EXISTS log_component_interactions;
DROP INDEX IF EXISTS resume_points_expires_at;
DROP INDEX IF EXISTS resume_points_schedule_id;
ALTER TABLE resume_points DROP COLUMN IF EXISTS schedule_id;
ALTER TABLE message_instances DROP COLUMN IF EXISTS message_data;
