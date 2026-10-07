-- Snapshot of the message data when an instance was sent/updated. Together with
-- flow_sources it describes exactly what the Discord user sees, e.g. to map the
-- values of a select menu back to its options. NULL for older instances.
ALTER TABLE message_instances ADD COLUMN IF NOT EXISTS message_data JSONB;

-- Messages with components sent by scheduled flows can be resumed as well.
ALTER TABLE resume_points ADD COLUMN IF NOT EXISTS schedule_id TEXT REFERENCES schedules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS resume_points_schedule_id ON resume_points (schedule_id);
CREATE INDEX IF NOT EXISTS resume_points_expires_at ON resume_points (expires_at);

-- Opt-in logging of every button / select menu interaction to the app logs.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS log_component_interactions BOOLEAN NOT NULL DEFAULT FALSE;
