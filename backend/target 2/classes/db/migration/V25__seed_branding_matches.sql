-- 1. Create Teams for Branding Test Club
INSERT INTO teams (id, organisation_id, name, category, age_group, slug, created_at) VALUES 
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Branding Lions', 'MENS', 'SENIOR', 'branding-lions', CURRENT_TIMESTAMP),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Branding Tigers', 'MENS', 'SENIOR', 'branding-tigers', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 2. Link Teams to Tournament
INSERT INTO tournament_teams (id, tournament_id, team_id, pool_number) VALUES
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'A'),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'A')
ON CONFLICT DO NOTHING;

-- 3. Create Matches
-- Live Match
INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, status, match_date, kick_off_time, pitch, home_score, away_score, created_at)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    'LIVE',
    CURRENT_DATE,
    '16:00:00',
    'Field 1',
    7,
    3,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Match Events for Live Match
INSERT INTO match_events (id, match_id, event_type, minute, notes) VALUES
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'TRY', 15, 'Branding Lions Try'),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'CONVERSION', 16, 'Branding Lions Conversion'),
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'PENALTY', 30, 'Branding Tigers Penalty');

-- Scheduled Match
INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, status, match_date, kick_off_time, pitch, created_at)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'SCHEDULED',
    CURRENT_DATE,
    '14:00:00',
    'Field 2',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
