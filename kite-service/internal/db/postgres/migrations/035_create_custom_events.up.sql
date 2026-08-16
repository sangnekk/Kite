CREATE TABLE IF NOT EXISTS custom_events (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE (app_id, name)
);

CREATE INDEX IF NOT EXISTS custom_events_app_id ON custom_events (app_id);

ALTER TABLE event_listeners
    ADD COLUMN IF NOT EXISTS custom_event_id TEXT REFERENCES custom_events(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS event_listeners_custom_event_id
    ON event_listeners (custom_event_id);
