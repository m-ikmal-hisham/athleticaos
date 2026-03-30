-- Migration for adding is_staff to persons
-- Using IF NOT EXISTS to prevent conflicts with Hibernate auto-ddl in dev environments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='persons' AND column_name='is_staff') THEN
        ALTER TABLE persons ADD COLUMN is_staff BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
