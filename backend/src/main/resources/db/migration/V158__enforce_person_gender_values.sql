-- V158: enforce MALE/FEMALE on persons.gender (T2b).
-- V155 already upper-cased case/whitespace variants. Any other value must be corrected by an administrator
-- BEFORE this migration runs. Stop with a clear count instead of failing on the constraint.
DO $$
DECLARE
    bad_count BIGINT;
BEGIN
    SELECT count(*) INTO bad_count
    FROM persons
    WHERE gender IS NULL OR gender NOT IN ('MALE', 'FEMALE');

    IF bad_count > 0 THEN
        RAISE EXCEPTION 'V158 preflight failed: % person row(s) have a gender other than MALE or FEMALE. Correct them before migrating.', bad_count;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_gender_values') THEN
        ALTER TABLE persons
            ADD CONSTRAINT chk_persons_gender_values CHECK (gender IN ('MALE', 'FEMALE'));
    END IF;
END $$;
