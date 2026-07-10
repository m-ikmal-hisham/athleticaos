-- Fix match_events to reference players instead of users

-- Drop the old constraint that references users(id)
ALTER TABLE match_events DROP CONSTRAINT match_events_player_id_fkey;

-- Add new constraint matching the new architecture referencing players(id)
ALTER TABLE match_events ADD CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
