DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Find and drop any UNIQUE constraint on tournament_format_configs that is SOLELY on tournament_id.
    -- This handles cases where constraint names might vary.
    FOR rec IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'tournament_format_configs'
          AND tc.constraint_type = 'UNIQUE'
        GROUP BY tc.constraint_name
        HAVING COUNT(*) = 1 
           AND MAX(kcu.column_name) = 'tournament_id'
    LOOP
        EXECUTE 'ALTER TABLE tournament_format_configs DROP CONSTRAINT "' || rec.constraint_name || '"';
        RAISE NOTICE 'Dropped persistent unique constraint on tournament_id: %', rec.constraint_name;
    END LOOP;
END $$;
