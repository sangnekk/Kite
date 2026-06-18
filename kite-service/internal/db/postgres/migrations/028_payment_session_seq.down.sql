DROP INDEX IF EXISTS payment_sessions_seq_idx;

ALTER TABLE payment_sessions DROP COLUMN IF EXISTS seq;

DROP SEQUENCE IF EXISTS payment_sessions_seq;
