DROP INDEX IF EXISTS event_listeners_custom_event_id;
ALTER TABLE event_listeners DROP COLUMN IF EXISTS custom_event_id;
DROP TABLE IF EXISTS custom_events;
