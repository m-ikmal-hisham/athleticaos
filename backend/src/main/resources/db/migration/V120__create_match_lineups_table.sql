CREATE TABLE IF NOT EXISTS match_lineups (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    team_id UUID NOT NULL,
    player_id UUID NOT NULL,
    jersey_number INTEGER,
    is_captain BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) NOT NULL,
    order_index INTEGER,
    is_starter BOOLEAN DEFAULT FALSE,
    position_display VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_lineup_match FOREIGN KEY (match_id) REFERENCES matches(id),
    CONSTRAINT fk_lineup_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_lineup_player FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_lineup_match ON match_lineups (match_id);
CREATE INDEX IF NOT EXISTS idx_lineup_team ON match_lineups (team_id);
CREATE INDEX IF NOT EXISTS idx_lineup_player ON match_lineups (player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lineup_unique_player ON match_lineups (match_id, player_id);
