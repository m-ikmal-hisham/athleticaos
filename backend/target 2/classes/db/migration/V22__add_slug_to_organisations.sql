-- Add slug column to organisations table
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Generate slugs for existing organisations
UPDATE organisations 
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
    )
)
WHERE slug IS NULL;

-- Handle potential duplicates by appending first 8 chars of ID
UPDATE organisations o1
SET slug = o1.slug || '-' || SUBSTRING(o1.id::text, 1, 8)
WHERE EXISTS (
    SELECT 1 FROM organisations o2 
    WHERE o2.slug = o1.slug AND o2.id != o1.id
);

-- Add unique constraint
ALTER TABLE organisations ADD CONSTRAINT uc_organisations_slug UNIQUE (slug);
