-- Phase G: Create tournament rosters and player suspensions tables

-- Create tournament_players table for roster management
CREATE TABLE IF NOT EXISTS tournament_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_eligible BOOLEAN NOT NULL DEFAULT true,
    eligibility_note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_tournament_team_player UNIQUE (tournament_id, team_id, player_id)
);

-- Create indexes for tournament_players
CREATE INDEX idx_tournament_player_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_player_team ON tournament_players(team_id);
CREATE INDEX idx_tournament_player_player ON tournament_players(player_id);
CREATE INDEX idx_tournament_player_tournament_team ON tournament_players(tournament_id, team_id);
CREATE INDEX idx_tournament_player_active ON tournament_players(is_active);
CREATE INDEX idx_tournament_player_tournament_team_active ON tournament_players(tournament_id, team_id, is_active);

-- Create player_suspensions table for card-based suspensions
CREATE TABLE IF NOT EXISTS player_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(500) NOT NULL,
    matches_remaining INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for player_suspensions
CREATE INDEX idx_player_suspension_tournament ON player_suspensions(tournament_id);
CREATE INDEX idx_player_suspension_team ON player_suspensions(team_id);
CREATE INDEX idx_player_suspension_player ON player_suspensions(player_id);
CREATE INDEX idx_player_suspension_active ON player_suspensions(is_active);
CREATE INDEX idx_player_suspension_tournament_active ON player_suspensions(tournament_id, is_active);
CREATE INDEX idx_player_suspension_tournament_team_active ON player_suspensions(tournament_id, team_id, is_active);
CREATE INDEX idx_player_suspension_tournament_player_active ON player_suspensions(tournament_id, player_id, is_active);
