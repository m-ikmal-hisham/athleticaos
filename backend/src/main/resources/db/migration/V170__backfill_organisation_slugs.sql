-- V170__backfill_organisation_slugs.sql
-- Backfill organisation slugs for existing rows where slug is NULL or blank.
-- Uses the same slugification pipeline as SlugGenerator.generateSlug:
--   1. lower(name)
--   2. Remove characters outside [a-z0-9\s-]
--   3. Replace whitespace runs with '-'
--   4. Collapse multiple '-' to a single '-'
--   5. Trim leading and trailing '-'
--   6. Fallback to 'org-' || left(id::text, 8) if empty
-- Resolves clashes set-based without violating uc_organisations_slug.

WITH to_update AS (
    SELECT 
        id,
        COALESCE(
            NULLIF(
                btrim(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(lower(name), '[^a-z0-9\s-]', '', 'g'),
                            '\s+', '-', 'g'
                        ),
                        '-+', '-', 'g'
                    ),
                    '-'
                ),
                ''
            ),
            'org-' || left(id::text, 8)
        ) AS base_slug
    FROM organisations
    WHERE slug IS NULL OR btrim(slug) = ''
),
clashes AS (
    SELECT 
        u.id,
        CASE 
            WHEN EXISTS (
                SELECT 1 
                FROM organisations o 
                WHERE o.slug = u.base_slug 
                  AND o.slug IS NOT NULL 
                  AND btrim(o.slug) <> ''
            )
            OR count(*) OVER (PARTITION BY u.base_slug) > 1
                THEN u.base_slug || '-' || left(u.id::text, 8)
            ELSE u.base_slug
        END AS final_slug
    FROM to_update u
)
UPDATE organisations o
SET slug = c.final_slug
FROM clashes c
WHERE o.id = c.id;
