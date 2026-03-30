-- Backfill all existing NULL is_staff values to FALSE
UPDATE persons SET is_staff = FALSE WHERE is_staff IS NULL;

-- Now set a NOT NULL constraint with default to prevent future NULLs
ALTER TABLE persons ALTER COLUMN is_staff SET NOT NULL;
ALTER TABLE persons ALTER COLUMN is_staff SET DEFAULT FALSE;
