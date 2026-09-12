-- Migration V153: Harden identification hash integrity constraints
-- Ensures hash/version atomicity and format compliance at the database level.
-- Does NOT modify V152 or any historical migration.

-- 1. Non-null hashes must be exactly 64 lowercase hex characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_identification_hash_format'
    ) THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_identification_hash_format
            CHECK (
                identification_hash IS NULL
                OR identification_hash ~ '^[0-9a-f]{64}$'
            );
    END IF;
END $$;

-- 2. Hash and version must be either both null or both present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_hash_version_consistency'
    ) THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_hash_version_consistency
            CHECK (
                (identification_hash IS NULL AND identification_hash_version IS NULL)
                OR (identification_hash IS NOT NULL AND identification_hash_version IS NOT NULL)
            );
    END IF;
END $$;

-- 3. Present versions must be positive integers (> 0)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_hash_version_positive'
    ) THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_hash_version_positive
            CHECK (
                identification_hash_version IS NULL
                OR identification_hash_version > 0
            );
    END IF;
END $$;
