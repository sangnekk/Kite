-- Move from one-conversation-per-context to multiple conversations (each with an
-- id + title), so the AI Studio can list and continue past chats.
DROP TABLE IF EXISTS ai_conversations;

CREATE TABLE ai_conversations (
    id          TEXT PRIMARY KEY,
    app_id      TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    context_key TEXT NOT NULL,
    title       TEXT NOT NULL DEFAULT '',
    messages    JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP NOT NULL,
    updated_at  TIMESTAMP NOT NULL
);

CREATE INDEX ai_conversations_app_context_idx
    ON ai_conversations (app_id, context_key, updated_at DESC);
