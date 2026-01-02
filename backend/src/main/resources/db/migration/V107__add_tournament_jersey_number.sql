-- Add tournament-specific jersey number to tournament_players table
ALTER TABLE tournament_players 
ADD COLUMN tournament_jersey_number INTEGER;

-- Add index for queries filtering by jersey number
CREATE INDEX idx_tournament_player_jersey_number 
ON tournament_players(tournament_id, team_id, tournament_jersey_number);

-- Add check constraint to ensure positive numbers
ALTER TABLE tournament_players 
ADD CONSTRAINT chk_tournament_jersey_number_positive 
CHECK (tournament_jersey_number IS NULL OR tournament_jersey_number > 0);
