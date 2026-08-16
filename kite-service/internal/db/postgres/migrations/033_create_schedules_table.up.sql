CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,

    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
    creator_user_id TEXT NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NOT NULL,

    trigger_type TEXT NOT NULL,                              -- 'interval' | 'cron'
    interval_seconds INT NOT NULL DEFAULT 0,
    cron_expression TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',

    next_run_at TIMESTAMP,
    last_run_at TIMESTAMP,

    flow_source JSONB NOT NULL,

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS schedules_app_id ON schedules (app_id);
CREATE INDEX IF NOT EXISTS schedules_module_id ON schedules (module_id);
CREATE INDEX IF NOT EXISTS schedules_due ON schedules (next_run_at) WHERE enabled;
