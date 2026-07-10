CREATE TABLE IF NOT EXISTS tournament_categories (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    gender VARCHAR(50),
    min_age INTEGER,
    max_age INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tournament_categories_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);
