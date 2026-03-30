-- Dynamic official roles lookup table
CREATE TABLE IF NOT EXISTS official_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255)
);

INSERT INTO official_roles (name, description) VALUES
('REFEREE', 'Match Referee'),
('ASSISTANT_REFEREE_1', 'Assistant Referee 1'),
('ASSISTANT_REFEREE_2', 'Assistant Referee 2'),
('TMO', 'Television Match Official'),
('FOURTH_OFFICIAL', 'Fourth Official');

-- Add optional person_id to official_registry (allows Person-based registration)
ALTER TABLE official_registry ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES persons(id);
ALTER TABLE official_registry ALTER COLUMN user_id DROP NOT NULL;

-- Add official_role_id FK to match_officials (gradual migration from string)
ALTER TABLE match_officials ADD COLUMN IF NOT EXISTS official_role_id INT REFERENCES official_roles(id);

-- Tournament officials panel
CREATE TABLE IF NOT EXISTS tournament_officials (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    official_id UUID NOT NULL REFERENCES official_registry(id),
    official_role_id INT REFERENCES official_roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, official_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_officials_tournament ON tournament_officials(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_officials_official ON tournament_officials(official_id);
