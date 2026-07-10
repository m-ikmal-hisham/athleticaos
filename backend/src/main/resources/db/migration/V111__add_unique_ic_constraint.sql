-- Clean up duplicate IC/passport values in persons table before creating the unique constraint
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(ic_or_passport)) ORDER BY created_at ASC, id ASC) as rn
    FROM persons
    WHERE ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> ''
)
UPDATE persons
SET ic_or_passport = ic_or_passport || '-DUP-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE id IN (
    SELECT id 
    FROM duplicates 
    WHERE rn > 1
);

ALTER TABLE persons ADD CONSTRAINT uc_persons_ic_or_passport UNIQUE (ic_or_passport);
