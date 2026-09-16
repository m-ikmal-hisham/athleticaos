-- V159: human-facing person registration number (CR-01). Not derived from any personal data.
-- Format AOS- + at least 6 digits (grows past 999999, never truncated). Existing rows are numbered in creation order.
CREATE SEQUENCE IF NOT EXISTS person_registration_no_seq AS BIGINT START WITH 1 MINVALUE 1;

CREATE OR REPLACE FUNCTION format_person_registration_no(n BIGINT) RETURNS VARCHAR
    LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT 'AOS-' || lpad(n::text, greatest(6, length(n::text)), '0')
$$;

CREATE OR REPLACE FUNCTION next_person_registration_no() RETURNS VARCHAR
    LANGUAGE sql VOLATILE AS $$
    SELECT format_person_registration_no(nextval('person_registration_no_seq'))
$$;

ALTER TABLE persons ADD COLUMN IF NOT EXISTS registration_no VARCHAR(20);

WITH ordered AS (
    SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
    FROM persons
    WHERE registration_no IS NULL
)
UPDATE persons p
SET registration_no = format_person_registration_no(o.rn)
FROM ordered o
WHERE p.id = o.id;

SELECT setval('person_registration_no_seq',
              GREATEST((SELECT count(*) FROM persons), 1),
              (SELECT count(*) FROM persons) > 0);

ALTER TABLE persons
    ALTER COLUMN registration_no SET DEFAULT next_person_registration_no(),
    ALTER COLUMN registration_no SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uc_persons_registration_no') THEN
        ALTER TABLE persons ADD CONSTRAINT uc_persons_registration_no UNIQUE (registration_no);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_persons_registration_no_format') THEN
        ALTER TABLE persons ADD CONSTRAINT chk_persons_registration_no_format
            CHECK (registration_no ~ '^AOS-[0-9]{6,}$');
    END IF;
END $$;
