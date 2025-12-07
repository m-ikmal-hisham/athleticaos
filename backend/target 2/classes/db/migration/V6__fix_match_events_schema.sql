-- Add created_at column
ALTER TABLE match_events ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add team_id column
ALTER TABLE match_events ADD COLUMN team_id UUID REFERENCES teams(id);

-- Update player_id to reference users instead of players (since we are using User entity for players currently)
ALTER TABLE match_events DROP CONSTRAINT match_events_player_id_fkey;
ALTER TABLE match_events ADD CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES users(id);
