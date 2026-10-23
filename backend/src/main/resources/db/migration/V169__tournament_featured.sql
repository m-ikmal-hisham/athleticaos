ALTER TABLE tournaments
    ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN featured_order INTEGER NULL,
    ADD CONSTRAINT chk_tournaments_featured_order CHECK (featured_order IS NULL OR (featured_order BETWEEN 1 AND 6));

CREATE INDEX idx_tournaments_featured_order ON tournaments (featured_order) WHERE featured = true;
