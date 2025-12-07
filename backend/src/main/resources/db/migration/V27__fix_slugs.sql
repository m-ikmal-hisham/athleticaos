-- Fix duplicate slugs
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM teams
)
UPDATE teams t
SET slug = t.slug || '-' || d.rn
FROM duplicates d
WHERE t.id = d.id AND d.rn > 1;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teams_slug_unique'
    ) THEN
        ALTER TABLE teams ADD CONSTRAINT teams_slug_unique UNIQUE (slug);
    END IF;
END $$;
