-- Add audit fields to organisations table
ALTER TABLE organisations
ADD COLUMN updated_at TIMESTAMP,
ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill updated_at with created_at for existing records
UPDATE organisations SET updated_at = created_at WHERE updated_at IS NULL;

-- Add not null constraint to updated_at after backfill
ALTER TABLE organisations ALTER COLUMN updated_at SET NOT NULL;
