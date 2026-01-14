-- Add category_id to tournament_format_configs
ALTER TABLE tournament_format_configs
ADD COLUMN category_id UUID;

-- Add foreign key constraint
ALTER TABLE tournament_format_configs
ADD CONSTRAINT fk_format_config_category
FOREIGN KEY (category_id) REFERENCES tournament_categories(id);

-- Drop old unique constraint (one config per tournament)
ALTER TABLE tournament_format_configs
DROP CONSTRAINT IF EXISTS tournament_format_configs_tournament_id_key;

-- Add new unique constraint (one config per tournament+category pair)
-- Note: category_id can be NULL (for global default), so we need a partial index or unique constraint that handles NULLs as distinct from values but unique per tournament.
-- PostgreSQL standard UNIQUE constraint treats NULLs as distinct (so multiple NULLs allowed), but we only want ONE global config (NULL category) per tournament.
-- So we need a unique index.

CREATE UNIQUE INDEX idx_format_config_tournament_category 
ON tournament_format_configs (tournament_id, category_id)
WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX idx_format_config_tournament_global
ON tournament_format_configs (tournament_id)
WHERE category_id IS NULL;
