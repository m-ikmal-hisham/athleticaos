-- Add image URL columns for photo upload feature

-- Add avatar_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add photo_url to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

-- Add logo_url and short_name to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS short_name VARCHAR(5);

-- Add banner_url and background_url to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS background_url VARCHAR(500);
