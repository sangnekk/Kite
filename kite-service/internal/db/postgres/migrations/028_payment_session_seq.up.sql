CREATE SEQUENCE IF NOT EXISTS payment_sessions_seq;

ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS seq BIGINT;

CREATE INDEX IF NOT EXISTS payment_sessions_seq_idx ON payment_sessions (seq);

-- Fail any pre-refactor pending sessions. Their payment ids use the old
-- base64 "KITE<base64>" memo scheme (no seq), which the new numeric IPN parser
-- can no longer match, so they could never be completed anyway.
UPDATE payment_sessions
SET status = 'failed',
    updated_at = timezone('utc', now())
WHERE status = 'pending' AND seq IS NULL;
