CREATE TABLE IF NOT EXISTS ai_conversations (
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    context_key TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (app_id, context_key)
);
