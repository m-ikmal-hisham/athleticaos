-- Fix duplicate slugs
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM teams
)
UPDATE teams t
SET slug = t.slug || '-' || d.rn
FROM duplicates d
WHERE t.id = d.id AND d.rn > 1;

-- Now try to add the unique constraint again
ALTER TABLE teams ADD CONSTRAINT teams_slug_unique UNIQUE (slug);
