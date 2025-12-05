-- Create Season table
CREATE TABLE season (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE,
    description TEXT,
    level VARCHAR(50),
    status VARCHAR(50),
    organiser_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_season_organiser FOREIGN KEY (organiser_id) REFERENCES organisations(id)
);

-- Add season_id and competition_type to tournaments table
ALTER TABLE tournaments ADD COLUMN season_id UUID;
ALTER TABLE tournaments ADD COLUMN competition_type VARCHAR(50);
ALTER TABLE tournaments ADD COLUMN is_age_grade BOOLEAN DEFAULT false;
ALTER TABLE tournaments ADD COLUMN age_group_label VARCHAR(100);

-- Add foreign key constraint
ALTER TABLE tournaments ADD CONSTRAINT fk_tournament_season FOREIGN KEY (season_id) REFERENCES season(id);

-- Create index for better query performance
CREATE INDEX idx_season_status ON season(status);
CREATE INDEX idx_season_level ON season(level);
CREATE INDEX idx_tournament_season ON tournaments(season_id);
