-- V144__add_matches_team_indexes.sql

-- 1. Create unique index on persons.email for non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_email_unique ON persons (email) WHERE email IS NOT NULL;

-- 2. Create indexes on matches home_team_id and away_team_id for fast team lookups
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches (home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches (away_team_id);
