-- Migration V152: Add identification HMAC hash columns, indexes, and constraints
-- Supports Phase 2 additive hashed identification infrastructure without dropping legacy plaintext

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS identification_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS identification_hash_version INTEGER,
    ADD COLUMN IF NOT EXISTS identification_verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED';

-- Partial unique index on identification_hash (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uc_persons_identification_hash
    ON persons (identification_hash)
    WHERE identification_hash IS NOT NULL;

-- Index on hash version for migration/rotation querying
CREATE INDEX IF NOT EXISTS idx_persons_identification_hash_version
    ON persons (identification_hash_version);

-- Index on verification status for filtering/reporting
CREATE INDEX IF NOT EXISTS idx_persons_identification_verification_status
    ON persons (identification_verification_status);

-- Check constraint on allowed verification status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_id_verification_status'
    ) THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_id_verification_status
            CHECK (identification_verification_status IN ('UNVERIFIED', 'VERIFIED', 'FLAGGED', 'LEGACY'));
    END IF;
END $$;
