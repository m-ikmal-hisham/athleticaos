-- Rename minute column to event_minute in match_events table
-- This avoids conflict with H2 reserved keyword 'minute'
ALTER TABLE match_events RENAME COLUMN minute TO event_minute;
