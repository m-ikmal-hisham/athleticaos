-- Add missing columns to tournament_teams table
ALTER TABLE tournament_teams
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
