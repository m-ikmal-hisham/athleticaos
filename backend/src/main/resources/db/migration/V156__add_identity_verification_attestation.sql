-- V156: administrator identity-verification attestation (OBS-05B follow-up).
-- A person is VERIFIED only together with who verified, when, and how. Any other status carries none of these.

-- Preflight: nothing in the application has ever set VERIFIED. If a row has it anyway (manual edit),
-- stop loudly instead of failing on the constraint with a less obvious message.
DO $$
DECLARE
    verified_count BIGINT;
BEGIN
    SELECT count(*) INTO verified_count FROM persons WHERE identification_verification_status = 'VERIFIED';
    IF verified_count > 0 THEN
        RAISE EXCEPTION 'V156 preflight failed: % person row(s) already have status VERIFIED without attestation data. Review them and set them to UNVERIFIED before migrating.', verified_count;
    END IF;
END $$;

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS identification_verified_at        TIMESTAMP    NULL,
    ADD COLUMN IF NOT EXISTS identification_verified_by        UUID         NULL,
    ADD COLUMN IF NOT EXISTS identification_verified_by_name   VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS identification_verification_method VARCHAR(32) NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_persons_identification_verified_by') THEN
        ALTER TABLE persons
            ADD CONSTRAINT fk_persons_identification_verified_by
            FOREIGN KEY (identification_verified_by) REFERENCES users (id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_id_verification_method') THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_id_verification_method
            CHECK (identification_verification_method IS NULL
                   OR identification_verification_method IN ('PRE_REGISTRATION_RECORD', 'DOCUMENT_SIGHTED'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_id_verification_attestation') THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_id_verification_attestation
            CHECK (
                (identification_verification_status = 'VERIFIED'
                    AND identification_verified_at IS NOT NULL
                    AND identification_verified_by IS NOT NULL
                    AND identification_verified_by_name IS NOT NULL
                    AND identification_verification_method IS NOT NULL)
                OR
                (identification_verification_status <> 'VERIFIED'
                    AND identification_verified_at IS NULL
                    AND identification_verified_by IS NULL
                    AND identification_verified_by_name IS NULL
                    AND identification_verification_method IS NULL)
            );
    END IF;
END $$;
