-- Remove NOT NULL constraint from home_team_id and away_team_id
-- This allows placeholder teams (e.g., "Winner Pool A") for future knockout matches
ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL;
