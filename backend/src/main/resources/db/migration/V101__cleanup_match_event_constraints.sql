-- Fix duplicate and incorrect foreign key constraints on match_events
-- Previous fix attempts (V40-V42) failed due to version numbering issues (current ver is 100)

-- Drop the known incorrect constraint referencing users
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_player_id_fkey;

-- Drop the hibernate-generated constraint if it exists (to ensure clean slate)
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS fkdhjkbqvon9gr1x0e1g9ma20ii;

-- Re-establish the correct constraint referencing players
ALTER TABLE match_events ADD CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id);
