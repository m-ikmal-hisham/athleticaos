-- Add slug column to tournaments table
ALTER TABLE tournaments ADD COLUMN slug VARCHAR(255);

-- Update existing records with a generated slug based on name and a substring of ID
-- Using a temporary function to ensure uniqueness is overkill for this migration, 
-- we will use a simple concatenation which serves the purpose for existing data.
UPDATE tournaments 
SET slug = LOWER(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-') 
    || '-' 
    || SUBSTRING(CAST(id AS VARCHAR), 1, 8)
);

-- Make slug not null and unique
ALTER TABLE tournaments ALTER COLUMN slug SET NOT NULL;
ALTER TABLE tournaments ADD CONSTRAINT uq_tournaments_slug UNIQUE (slug);
