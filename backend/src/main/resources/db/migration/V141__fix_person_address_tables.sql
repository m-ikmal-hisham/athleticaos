DO $$ 
BEGIN 
    -- Check if 'address' column exists and 'address_line1' does not, meaning we are coming from a clean state
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='address') THEN
        
        -- Try to rename address only if full_address_legacy doesn't already exist from a half-aborted V123
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='full_address_legacy') THEN
            ALTER TABLE persons RENAME COLUMN address TO full_address_legacy;
        END IF;

    END IF;
END $$;

ALTER TABLE persons
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS postcode VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(255),
ADD COLUMN IF NOT EXISTS state VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(255);
