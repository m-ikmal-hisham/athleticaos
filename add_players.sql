-- =====================================================
-- Add Players to Test Teams
-- =====================================================

DO $$
DECLARE
    team_record RECORD;
    person_uuid UUID;
    player_uuid UUID;
    player_names TEXT[] := ARRAY['Ahmad', 'Bong', 'Charlie', 'David', 'Eric'];
    last_names TEXT[] := ARRAY['Abdullah', 'Wong', 'Anak Janting', 'Lee', 'Rahman'];
    positions TEXT[] := ARRAY['PROP', 'HOOKER', 'LOCK', 'FLANKER', 'CENTRE'];
    i INTEGER;
    jersey INTEGER;
BEGIN
    jersey := 1;
    
    FOR team_record IN SELECT id, name FROM teams WHERE name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles')
    LOOP
        FOR i IN 1..5 LOOP
            person_uuid := gen_random_uuid();
            player_uuid := gen_random_uuid();
            
            -- Create person
            INSERT INTO persons (id, first_name, last_name, gender, dob, ic_or_passport, nationality, email, created_at)
            VALUES (
                person_uuid,
                player_names[i],
                last_names[i],
                'MALE',
                CURRENT_DATE - (20 + i)::integer * INTERVAL '1 year',
                '000000-00-000' || jersey::text,
                'Malaysian',
                lower(player_names[i]) || '.' || lower(replace(team_record.name, ' ', '')) || '_' || jersey || '@test.com',
                CURRENT_TIMESTAMP
            );
            
            -- Create player profile
            INSERT INTO players (id, person_id, status, created_at)
            VALUES (
                player_uuid,
                person_uuid,
                'ACTIVE',
                CURRENT_TIMESTAMP
            );
            
            -- Associate player with team
            INSERT INTO player_teams (id, player_id, team_id, jersey_number, position, joined_date, is_active, created_at)
            VALUES (
                gen_random_uuid(),
                player_uuid,
                team_record.id,
                jersey,
                positions[i],
                CURRENT_DATE - INTERVAL '1 year',
                true,
                CURRENT_TIMESTAMP
            );
            
            jersey := jersey + 1;
        END LOOP;
        
        RAISE NOTICE 'Created 5 players for team: %', team_record.name;
    END LOOP;
    
    RAISE NOTICE 'All test players created successfully!';
END $$;

-- Verify the data
SELECT 'Players per team:' as info;
SELECT t.name as team_name, COUNT(pt.player_id) as player_count
FROM teams t
LEFT JOIN player_teams pt ON t.id = pt.team_id AND pt.is_active = true
WHERE t.name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles')
GROUP BY t.name;
