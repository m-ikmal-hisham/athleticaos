-- Remove match events first (references matches)
-- First, find all match IDs that reference the branding teams
DELETE FROM match_events WHERE match_id IN (
    SELECT id FROM matches 
    WHERE home_team_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')
       OR away_team_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')
);

-- Remove ALL matches that reference the branding teams (from any tournament)
DELETE FROM matches 
WHERE home_team_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')
   OR away_team_id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555');

-- Remove tournament teams (references tournament and teams)
DELETE FROM tournament_teams WHERE tournament_id = '33333333-3333-3333-3333-333333333333';

-- Remove tournament players (if any exist)
DELETE FROM tournament_players WHERE tournament_id = '33333333-3333-3333-3333-333333333333';

-- Remove player season lifecycles for the branding org
DELETE FROM player_season_lifecycles WHERE organisation_id = '11111111-1111-1111-1111-111111111111';

-- Remove player teams for the branding teams
DELETE FROM player_teams WHERE team_id IN (
    '44444444-4444-4444-4444-444444444444', 
    '55555555-5555-5555-5555-555555555555'
);

-- Remove teams (now safe after matches are deleted)
DELETE FROM teams WHERE id IN (
    '44444444-4444-4444-4444-444444444444', 
    '55555555-5555-5555-5555-555555555555'
);

-- Remove players (Lions and Tigers)
DELETE FROM players WHERE id IN (
    '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003'
);

-- Remove persons (Lions and Tigers)
DELETE FROM persons WHERE id IN (
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'
);

-- Remove tournament (now safe after all references are deleted)
DELETE FROM tournaments WHERE id = '33333333-3333-3333-3333-333333333333';

-- Remove user roles for the branding admin
DELETE FROM user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222';

-- Remove user
DELETE FROM users WHERE id = '22222222-2222-2222-2222-222222222222';

-- Remove organisation (last, after all references are deleted)
DELETE FROM organisations WHERE id = '11111111-1111-1111-1111-111111111111';
