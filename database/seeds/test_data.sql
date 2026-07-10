-- =====================================================
-- Test Data Script for Phase G Roster Management
-- Run this script manually using psql or your DB client
-- =====================================================

-- Step 1: Get the tournament ID you want to use
-- Replace the UUID below with your actual tournament ID from the URL
-- Example URL: /dashboard/tournaments/96ba354f-85ab-4fb0-bf96-61709b570327/rosters
-- The tournament ID is: 96ba354f-85ab-4fb0-bf96-61709b570327

-- First, let's see what tournaments exist:
-- SELECT id, name FROM tournaments LIMIT 10;

-- Set the tournament UUID (REPLACE THIS with your actual tournament ID)
\set tournament_id '96ba354f-85ab-4fb0-bf96-61709b570327'

-- Step 2: Create test teams
DO $$
DECLARE
    org_uuid UUID;
    team1_uuid UUID := gen_random_uuid();
    team2_uuid UUID := gen_random_uuid();
    team3_uuid UUID := gen_random_uuid();
    team4_uuid UUID := gen_random_uuid();
BEGIN
    -- Get an organisation ID
    SELECT id INTO org_uuid FROM organisations LIMIT 1;
    
    IF org_uuid IS NULL THEN
        RAISE EXCEPTION 'No organisation found. Please create an organisation first.';
    END IF;
    
    -- Create 4 test teams
    INSERT INTO teams (id, organisation_id, slug, name, category, age_group, division, state, status, created_at)
    VALUES 
        (team1_uuid, org_uuid, 'sarawak-sharks', 'Sarawak Sharks', 'MENS', 'OPEN', 'PREMIER', 'Sarawak', 'ACTIVE', CURRENT_TIMESTAMP),
        (team2_uuid, org_uuid, 'kuching-thunder', 'Kuching Thunder', 'MENS', 'OPEN', 'PREMIER', 'Sarawak', 'ACTIVE', CURRENT_TIMESTAMP),
        (team3_uuid, org_uuid, 'miri-warriors', 'Miri Warriors', 'MENS', 'OPEN', 'PREMIER', 'Sarawak', 'ACTIVE', CURRENT_TIMESTAMP),
        (team4_uuid, org_uuid, 'sibu-eagles', 'Sibu Eagles', 'MENS', 'OPEN', 'PREMIER', 'Sarawak', 'ACTIVE', CURRENT_TIMESTAMP)
    ON CONFLICT (slug) DO NOTHING;
    
    RAISE NOTICE 'Teams created successfully';
END $$;

-- Step 3: Associate teams with the tournament
INSERT INTO tournament_teams (tournament_id, team_id)
SELECT :'tournament_id'::uuid, t.id
FROM teams t
WHERE t.name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles')
ON CONFLICT DO NOTHING;

-- Step 4: Create test players and assign to teams
DO $$
DECLARE
    org_uuid UUID;
    team_record RECORD;
    player_uuid UUID;
    player_names TEXT[] := ARRAY[
        'Ahmad', 'Bong', 'Charlie', 'David', 'Eric',
        'Farid', 'George', 'Hassan', 'Ivan', 'James'
    ];
    last_names TEXT[] := ARRAY[
        'Abdullah', 'Wong', 'Anak Janting', 'Lee', 'Rahman',
        'Yusof', 'Lim', 'Ibrahim', 'Petrov', 'Cook'
    ];
    positions TEXT[] := ARRAY[
        'PROP', 'HOOKER', 'LOCK', 'FLANKER', 'NUMBER_EIGHT',
        'SCRUM_HALF', 'FLY_HALF', 'CENTRE', 'WING', 'FULLBACK'
    ];
    i INTEGER;
    jersey INTEGER;
BEGIN
    SELECT id INTO org_uuid FROM organisations LIMIT 1;
    
    jersey := 1;
    
    FOR team_record IN SELECT id, name FROM teams WHERE name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles')
    LOOP
        FOR i IN 1..5 LOOP
            player_uuid := gen_random_uuid();
            
            -- Create user
            INSERT INTO users (id, email, password_hash, first_name, last_name, organisation_id, is_active, created_at)
            VALUES (
                player_uuid,
                lower(player_names[i]) || '.' || lower(replace(team_record.name, ' ', '')) || '@test.com',
                '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO',
                player_names[i],
                last_names[i],
                org_uuid,
                true,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
            RETURNING id INTO player_uuid;
            
            -- Create player profile
            INSERT INTO players (player_id, date_of_birth, position, jersey_number, status)
            VALUES (
                player_uuid,
                CURRENT_DATE - (20 + i)::integer * INTERVAL '1 year',
                positions[i],
                jersey,
                'ACTIVE'
            )
            ON CONFLICT (player_id) DO NOTHING;
            
            -- Associate player with team
            INSERT INTO player_teams (player_id, team_id, joined_date, is_active)
            VALUES (
                player_uuid,
                team_record.id,
                CURRENT_DATE - INTERVAL '1 year',
                true
            )
            ON CONFLICT DO NOTHING;
            
            jersey := jersey + 1;
        END LOOP;
        
        RAISE NOTICE 'Created 5 players for team: %', team_record.name;
    END LOOP;
    
    RAISE NOTICE 'All test data created successfully!';
END $$;

-- Step 5: Verify the data
SELECT 'Teams in tournament:' as info;
SELECT t.name, tt.tournament_id 
FROM teams t 
JOIN tournament_teams tt ON t.id = tt.team_id 
WHERE t.name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles');

SELECT 'Players per team:' as info;
SELECT t.name as team_name, COUNT(pt.player_id) as player_count
FROM teams t
LEFT JOIN player_teams pt ON t.id = pt.team_id AND pt.is_active = true
WHERE t.name IN ('Sarawak Sharks', 'Kuching Thunder', 'Miri Warriors', 'Sibu Eagles')
GROUP BY t.name;
