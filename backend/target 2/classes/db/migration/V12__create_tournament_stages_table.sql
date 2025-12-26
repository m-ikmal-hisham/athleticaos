-- Create tournament_stages table for bracket management
CREATE TABLE tournament_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    display_order INTEGER,
    is_group_stage BOOLEAN NOT NULL DEFAULT false,
    is_knockout_stage BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster tournament stage lookups
CREATE INDEX idx_tournament_stages_tournament_id ON tournament_stages(tournament_id);
CREATE INDEX idx_tournament_stages_display_order ON tournament_stages(tournament_id, display_order);
