-- V144__add_matches_team_indexes.sql

-- 1. Clean up duplicate emails in persons table before creating the unique index
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(email)) ORDER BY created_at ASC, id ASC) as rn
    FROM persons
    WHERE email IS NOT NULL AND TRIM(email) <> ''
)
UPDATE persons
SET email = NULL
WHERE id IN (
    SELECT id 
    FROM duplicates 
    WHERE rn > 1
);

-- 2. Create unique index on persons.email for non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_email_unique ON persons (email) WHERE email IS NOT NULL;

-- 3. Create indexes on matches home_team_id and away_team_id for fast team lookups
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON matches (home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON matches (away_team_id);
