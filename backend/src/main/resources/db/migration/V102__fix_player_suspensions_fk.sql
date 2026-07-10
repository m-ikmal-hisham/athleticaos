-- Fix player_suspensions foreign key to reference players table instead of users

-- Drop the existing foreign key constraint
ALTER TABLE player_suspensions
DROP CONSTRAINT IF EXISTS player_suspensions_player_id_fkey;

-- Add the new foreign key constraint referencing players
ALTER TABLE player_suspensions
ADD CONSTRAINT player_suspensions_player_id_fkey
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
