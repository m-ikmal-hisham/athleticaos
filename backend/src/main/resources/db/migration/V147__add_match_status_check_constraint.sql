-- Add CHECK constraint on matches.status and set a DEFAULT
-- Ensures only recognized status values can be stored.
-- Also adds DEFAULT 'SCHEDULED' so INSERTs don't fail silently
-- when status is omitted.
--
-- Uses NOT VALID + VALIDATE pattern for production safety.

-- Add default first (instant, no table scan)
ALTER TABLE matches ALTER COLUMN status SET DEFAULT 'SCHEDULED';

-- Add the CHECK constraint without validating existing rows
ALTER TABLE matches
    ADD CONSTRAINT chk_match_status
    CHECK (status IN (
        'SCHEDULED',
        'ONGOING',
        'LIVE',
        'COMPLETED',
        'CANCELLED'
    )) NOT VALID;

-- Validate existing rows in a separate step
ALTER TABLE matches VALIDATE CONSTRAINT chk_match_status;
