-- Create persons table
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    ic_or_passport VARCHAR(255) NOT NULL,
    nationality VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL,
    dominant_hand VARCHAR(50),
    dominant_leg VARCHAR(50),
    height_cm INTEGER,
    weight_kg INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_players_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);

-- Update player_teams table to reference players instead of users
-- We truncate the table first because existing user_ids won't match player_ids
TRUNCATE TABLE player_teams;

-- Drop existing constraints and indexes
ALTER TABLE player_teams DROP CONSTRAINT IF EXISTS fk_player_teams_user;
ALTER TABLE player_teams DROP CONSTRAINT IF EXISTS player_teams_unique;
DROP INDEX IF EXISTS idx_player_teams_user;

-- Rename column
ALTER TABLE player_teams RENAME COLUMN user_id TO player_id;

-- Add new constraints and indexes
ALTER TABLE player_teams ADD CONSTRAINT fk_player_teams_player FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
ALTER TABLE player_teams ADD CONSTRAINT player_teams_unique UNIQUE(player_id, team_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_player ON player_teams(player_id);
