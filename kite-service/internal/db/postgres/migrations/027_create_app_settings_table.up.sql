CREATE TABLE app_settings (
    app_id TEXT PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
    enable_prefix_commands BOOLEAN NOT NULL DEFAULT FALSE,
    command_prefix TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
