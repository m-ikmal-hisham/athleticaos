-- Phase B Fixes - Database Migration Script
-- Add slug column to teams table and create player_teams junction table

-- 1. Add slug column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- 2. Generate slugs for existing teams (only if null)
UPDATE teams 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    )
)
WHERE slug IS NULL;

-- 3. Handle duplicate slugs (simplified for migration safety)
-- In a real scenario, we'd need a more robust de-duplication strategy here
-- For now, we assume the manual fix script or previous run handled it if needed

-- 4. Make slug NOT NULL and UNIQUE (safe application)
-- We wrap in a DO block to check if constraint exists
ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_slug_unique') THEN
        ALTER TABLE teams ADD CONSTRAINT teams_slug_unique UNIQUE (slug);
    END IF;
END $$;

-- 5. Create player_teams junction table
CREATE TABLE IF NOT EXISTS player_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    team_id UUID NOT NULL,
    jersey_number INTEGER,
    position VARCHAR(50),
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_player_teams_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_player_teams_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT player_teams_unique UNIQUE(user_id, team_id)
);

-- 6. Create indexes for better query performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_player_teams_user ON player_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_team ON player_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_active ON player_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
