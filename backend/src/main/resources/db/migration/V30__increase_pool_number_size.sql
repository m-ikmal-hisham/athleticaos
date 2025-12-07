-- Increase pool_number column size to accommodate longer pool names
ALTER TABLE tournament_teams ALTER COLUMN pool_number TYPE VARCHAR(50);
