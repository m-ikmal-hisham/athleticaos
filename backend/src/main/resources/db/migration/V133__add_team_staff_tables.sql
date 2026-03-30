CREATE TABLE staff_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255)
);

INSERT INTO staff_roles (name, description) VALUES
('HEAD_COACH', 'Head Coach'),
('ASSISTANT_COACH', 'Assistant Coach'),
('FORWARD_COACH', 'Forward Coach'),
('BACKLINE_COACH', 'Backline Coach'),
('STRENGTH_AND_CONDITIONING_COACH', 'Strength and Conditioning Coach'),
('MANAGER', 'Team Manager'),
('PHYSIO', 'Physiotherapist'),
('MEDIC', 'Medical Staff');

CREATE TABLE team_staff (
    id UUID PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id),
    person_id UUID NOT NULL REFERENCES persons(id),
    staff_role_id INT NOT NULL REFERENCES staff_roles(id),
    joined_at DATE NOT NULL,
    UNIQUE(team_id, person_id, staff_role_id)
);

CREATE TABLE tournament_staff (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    tournament_team_id UUID NOT NULL REFERENCES tournament_teams(id),
    person_id UUID NOT NULL REFERENCES persons(id),
    staff_role_id INT NOT NULL REFERENCES staff_roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_id, tournament_team_id, person_id, staff_role_id)
);

CREATE INDEX idx_team_staff_team_id ON team_staff(team_id);
CREATE INDEX idx_team_staff_person_id ON team_staff(person_id);
CREATE INDEX idx_tournament_staff_tournament_team_id ON tournament_staff(tournament_team_id);
CREATE INDEX idx_tournament_staff_person_id ON tournament_staff(person_id);
