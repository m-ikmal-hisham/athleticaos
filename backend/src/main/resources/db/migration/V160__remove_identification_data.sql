-- V160: remove all IC/passport identification data (CR-01) and rename the attestation columns to record verification.

-- 1. Drop indexes and constraints tied to identification values or hashes
DROP INDEX IF EXISTS uc_persons_identification_hash;
DROP INDEX IF EXISTS idx_persons_identification_hash_version;

ALTER TABLE persons
    DROP CONSTRAINT IF EXISTS uc_persons_ic_or_passport,
    DROP CONSTRAINT IF EXISTS chk_persons_identification_hash_format,
    DROP CONSTRAINT IF EXISTS chk_persons_hash_version_consistency,
    DROP CONSTRAINT IF EXISTS chk_persons_hash_version_positive,
    DROP CONSTRAINT IF EXISTS chk_persons_id_verification_attestation,
    DROP CONSTRAINT IF EXISTS chk_persons_id_verification_method,
    DROP CONSTRAINT IF EXISTS chk_persons_id_verification_status;

-- 2. Drop every column that holds or derives from an IC/passport number
ALTER TABLE persons
    DROP COLUMN IF EXISTS ic_or_passport,
    DROP COLUMN IF EXISTS identification_type,
    DROP COLUMN IF EXISTS identification_value,
    DROP COLUMN IF EXISTS identification_hash,
    DROP COLUMN IF EXISTS identification_hash_version;

-- 3. Rename the attestation columns: verification no longer involves an identification number
ALTER INDEX IF EXISTS idx_persons_identification_verification_status RENAME TO idx_persons_record_verification_status;
ALTER TABLE persons RENAME CONSTRAINT fk_persons_identification_verified_by TO fk_persons_record_verified_by;
ALTER TABLE persons RENAME COLUMN identification_verification_status  TO record_verification_status;
ALTER TABLE persons RENAME COLUMN identification_verified_at          TO record_verified_at;
ALTER TABLE persons RENAME COLUMN identification_verified_by          TO record_verified_by;
ALTER TABLE persons RENAME COLUMN identification_verified_by_name     TO record_verified_by_name;
ALTER TABLE persons RENAME COLUMN identification_verification_method  TO record_verification_method;

-- 4. LEGACY and FLAGGED meant "identification not validated" and have no meaning without it
UPDATE persons
SET record_verification_status = 'UNVERIFIED'
WHERE record_verification_status IS NULL OR record_verification_status NOT IN ('VERIFIED', 'UNVERIFIED');

UPDATE persons
SET record_verified_at = NULL, record_verified_by = NULL,
    record_verified_by_name = NULL, record_verification_method = NULL
WHERE record_verification_status <> 'VERIFIED';

-- 5. Re-create the rules under the new names
ALTER TABLE persons
    ADD CONSTRAINT chk_persons_record_verification_status
        CHECK (record_verification_status IN ('VERIFIED', 'UNVERIFIED')),
    ADD CONSTRAINT chk_persons_record_verification_method
        CHECK (record_verification_method IS NULL
               OR record_verification_method IN ('PRE_REGISTRATION_RECORD', 'DOCUMENT_SIGHTED')),
    ADD CONSTRAINT chk_persons_record_verification_attestation
        CHECK ((record_verification_status = 'VERIFIED'
                    AND record_verified_at IS NOT NULL
                    AND record_verified_by IS NOT NULL
                    AND record_verified_by_name IS NOT NULL
                    AND record_verification_method IS NOT NULL)
               OR (record_verification_status <> 'VERIFIED'
                    AND record_verified_at IS NULL
                    AND record_verified_by IS NULL
                    AND record_verified_by_name IS NULL
                    AND record_verification_method IS NULL));
