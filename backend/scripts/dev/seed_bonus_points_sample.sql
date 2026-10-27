-- ============================================================================
-- Seed Script: Bonus Points Sample (4-team pool)
-- Demonstrates configurable rugby bonus points (try bonus & losing bonus)
--
-- Scenario:
--   Pool A with 4 teams: Team A, Team B, Team C, Team D.
--   Scoring rules: Win = 4, Draw = 2, Loss = 0.
--   Try bonus: 1 pt for 4+ tries.
--   Losing bonus: 1 pt for loss within 7 points.
--
-- Matches:
--   M1: Team A 31 - 24 Team B (Team A: 5 tries -> 4+1=5; Team B: 4 tries, diff 7 -> 0+1+1=2)
--   M2: Team C 18 - 10 Team D (Team C: 2 tries -> 4+0=4; Team D: 1 try, diff 8 -> 0+0=0)
--   M3: Team A 12 - 12 Team C (Team A: 2 tries -> 2+0=2; Team C: 2 tries -> 2+0=2)
--   M4: Team B 28 - 0 Team D (WALKOVER: Team B winner -> 4+0=4; Team D -> 0+0=0; no events)
--   M5: Team A 24 - 5 Team D (Team A: 4 tries -> 4+1=5; Team D: 1 try -> 0+0=0)
--   M6: Team B 15 - 17 Team C (Team B: 3 tries, diff 2 -> 0+0+1=1; Team C: 3 tries -> 4+0=4)
--
-- Expected Standings:
--   1. Team A | P: 3 | W: 2 | D: 1 | L: 0 | PF: 67 | PA: 41 | +/-: +26 | BP: 2 | Pts: 12
--   2. Team C | P: 3 | W: 2 | D: 1 | L: 0 | PF: 47 | PA: 37 | +/-: +10 | BP: 0 | Pts: 10
--   3. Team B | P: 3 | W: 1 | D: 0 | L: 2 | PF: 67 | PA: 48 | +/-: +19 | BP: 3 | Pts: 7
--   4. Team D | P: 3 | W: 0 | D: 0 | L: 3 | PF: 15 | PA: 70 | +/-: -55 | BP: 0 | Pts: 0
-- ============================================================================

DO $$
DECLARE
    v_org_id UUID;
    v_tournament_id UUID := gen_random_uuid();
    v_stage_id UUID := gen_random_uuid();
    v_team_a_id UUID := gen_random_uuid();
    v_team_b_id UUID := gen_random_uuid();
    v_team_c_id UUID := gen_random_uuid();
    v_team_d_id UUID := gen_random_uuid();
    v_match_1_id UUID := gen_random_uuid();
    v_match_2_id UUID := gen_random_uuid();
    v_match_3_id UUID := gen_random_uuid();
    v_match_4_id UUID := gen_random_uuid();
    v_match_5_id UUID := gen_random_uuid();
    v_match_6_id UUID := gen_random_uuid();
    v_old_tournament_id UUID;
BEGIN
    -- Safety check: only run on local dev databases
    IF current_database() NOT IN ('athleticaos', 'athleticaos_dev') THEN
        RAISE EXCEPTION 'Refusing to run seed script on non-dev database: %', current_database();
    END IF;

    -- Clean up previous run if exists
    SELECT id INTO v_old_tournament_id FROM tournaments WHERE slug = 'bonus-points-sample-15s';
    IF v_old_tournament_id IS NOT NULL THEN
        DELETE FROM match_events WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = v_old_tournament_id);
        DELETE FROM matches WHERE tournament_id = v_old_tournament_id;
        DELETE FROM tournament_teams WHERE tournament_id = v_old_tournament_id;
        DELETE FROM tournament_stages WHERE tournament_id = v_old_tournament_id;
        DELETE FROM tournament_format_configs WHERE tournament_id = v_old_tournament_id;
        DELETE FROM tournaments WHERE id = v_old_tournament_id;
    END IF;

    -- Clean up sample teams if they exist from previous run
    DELETE FROM teams WHERE slug IN ('bp-sample-team-a', 'bp-sample-team-b', 'bp-sample-team-c', 'bp-sample-team-d');

    -- Resolve or create an organisation
    SELECT id INTO v_org_id FROM organisations LIMIT 1;
    IF v_org_id IS NULL THEN
        v_org_id := gen_random_uuid();
        INSERT INTO organisations (id, name, slug, org_type, org_level, created_at)
        VALUES (v_org_id, 'Sample Rugby Union', 'sample-rugby-union', 'UNION', 'NATIONAL', CURRENT_TIMESTAMP);
    END IF;

    -- 1. Create Tournament
    INSERT INTO tournaments (
        id, name, level, slug, organiser_org_id, start_date, end_date,
        venue, is_published, status, format, number_of_pools, created_at, deleted
    ) VALUES (
        v_tournament_id, 'Bonus Points Sample 15s', 'CLUB', 'bonus-points-sample-15s',
        v_org_id, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days',
        'National Stadium', TRUE, 'LIVE', 'ROUND_ROBIN', 1, CURRENT_TIMESTAMP, FALSE
    );

    -- 2. Create Format Config with Bonus Points enabled
    INSERT INTO tournament_format_configs (
        id, tournament_id, format_type, rugby_format, team_count, pool_count,
        match_duration_minutes, points_win, points_draw, points_loss,
        points_bonus_try, points_bonus_loss, bonus_points_enabled,
        bonus_try_threshold, bonus_losing_margin, starters_count, max_bench_count,
        created_at
    ) VALUES (
        gen_random_uuid(), v_tournament_id, 'ROUND_ROBIN', 'XV', 4, 1,
        80, 4, 2, 0,
        1, 1, TRUE,
        4, 7, 15, 8,
        CURRENT_TIMESTAMP
    );

    -- 3. Create Tournament Stage (Pool A)
    INSERT INTO tournament_stages (
        id, tournament_id, name, stage_type, display_order, is_group_stage, is_knockout_stage, created_at
    ) VALUES (
        v_stage_id, v_tournament_id, 'Pool A', 'POOL', 1, TRUE, FALSE, CURRENT_TIMESTAMP
    );

    -- 4. Create 4 Teams
    INSERT INTO teams (id, organisation_id, name, short_name, slug, category, age_group, status, created_at)
    VALUES
        (v_team_a_id, v_org_id, 'Team A (Harlequins)', 'HAR', 'bp-sample-team-a', 'MENS', 'OPEN', 'Active', CURRENT_TIMESTAMP),
        (v_team_b_id, v_org_id, 'Team B (Saracens)',   'SAR', 'bp-sample-team-b', 'MENS', 'OPEN', 'Active', CURRENT_TIMESTAMP),
        (v_team_c_id, v_org_id, 'Team C (Tigers)',     'TIG', 'bp-sample-team-c', 'MENS', 'OPEN', 'Active', CURRENT_TIMESTAMP),
        (v_team_d_id, v_org_id, 'Team D (Bath)',       'BAT', 'bp-sample-team-d', 'MENS', 'OPEN', 'Active', CURRENT_TIMESTAMP);

    -- 5. Link Teams to Tournament
    INSERT INTO tournament_teams (id, tournament_id, team_id, pool_number, pool_slot, is_active, deleted, created_at)
    VALUES
        (gen_random_uuid(), v_tournament_id, v_team_a_id, 'Pool A', 1, TRUE, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_tournament_id, v_team_b_id, 'Pool A', 2, TRUE, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_tournament_id, v_team_c_id, 'Pool A', 3, TRUE, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_tournament_id, v_team_d_id, 'Pool A', 4, TRUE, FALSE, CURRENT_TIMESTAMP);

    -- 6. Create Matches
    -- Match 1: Team A vs Team B (31 - 24)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_1_id, v_tournament_id, v_stage_id, v_team_a_id, v_team_b_id, 'COMPLETED',
        31, 24, 'NORMAL', 'M1', 1,
        CURRENT_DATE, '10:00:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- Match 2: Team C vs Team D (18 - 10)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_2_id, v_tournament_id, v_stage_id, v_team_c_id, v_team_d_id, 'COMPLETED',
        18, 10, 'NORMAL', 'M2', 2,
        CURRENT_DATE, '11:30:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- Match 3: Team A vs Team C (12 - 12)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_3_id, v_tournament_id, v_stage_id, v_team_a_id, v_team_c_id, 'COMPLETED',
        12, 12, 'NORMAL', 'M3', 3,
        CURRENT_DATE, '13:00:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- Match 4: Team B vs Team D (28 - 0 WALKOVER, winner Team B, no events)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, winner_team_id, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_4_id, v_tournament_id, v_stage_id, v_team_b_id, v_team_d_id, 'COMPLETED',
        28, 0, 'WALKOVER', v_team_b_id, 'M4', 4,
        CURRENT_DATE, '14:30:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- Match 5: Team A vs Team D (24 - 5)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_5_id, v_tournament_id, v_stage_id, v_team_a_id, v_team_d_id, 'COMPLETED',
        24, 5, 'NORMAL', 'M5', 5,
        CURRENT_DATE, '16:00:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- Match 6: Team B vs Team C (15 - 17)
    INSERT INTO matches (
        id, tournament_id, stage_id, home_team_id, away_team_id, status,
        home_score, away_score, result_type, match_code, match_number,
        match_date, kick_off_time, pitch, created_at, deleted
    ) VALUES (
        v_match_6_id, v_tournament_id, v_stage_id, v_team_b_id, v_team_c_id, 'COMPLETED',
        15, 17, 'NORMAL', 'M6', 6,
        CURRENT_DATE, '17:30:00', 'Pitch 1', CURRENT_TIMESTAMP, FALSE
    );

    -- 7. Create Match Events (Events sum exactly to match scores: TRY 5, CONVERSION 2, PENALTY 3)
    -- Match 1: Team A 31 (5 tries, 3 conversions), Team B 24 (4 tries, 2 conversions)
    INSERT INTO match_events (id, match_id, team_id, event_type, event_minute, is_locked, created_at) VALUES
        -- Team A: 5 * 5 + 3 * 2 = 31
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'TRY', 10, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'CONVERSION', 11, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'TRY', 25, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'CONVERSION', 26, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'TRY', 45, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'TRY', 60, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'TRY', 72, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_a_id, 'CONVERSION', 73, FALSE, CURRENT_TIMESTAMP),
        -- Team B: 4 * 5 + 2 * 2 = 24
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'TRY', 15, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'CONVERSION', 16, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'TRY', 35, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'TRY', 52, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'CONVERSION', 53, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_1_id, v_team_b_id, 'TRY', 78, FALSE, CURRENT_TIMESTAMP);

    -- Match 2: Team C 18 (2 tries, 1 conversion, 2 penalties), Team D 10 (1 try, 1 conversion, 1 penalty)
    INSERT INTO match_events (id, match_id, team_id, event_type, event_minute, is_locked, created_at) VALUES
        -- Team C: 2 * 5 + 1 * 2 + 2 * 3 = 18
        (gen_random_uuid(), v_match_2_id, v_team_c_id, 'PENALTY', 8, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_c_id, 'TRY', 22, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_c_id, 'CONVERSION', 23, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_c_id, 'PENALTY', 49, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_c_id, 'TRY', 65, FALSE, CURRENT_TIMESTAMP),
        -- Team D: 1 * 5 + 1 * 2 + 1 * 3 = 10
        (gen_random_uuid(), v_match_2_id, v_team_d_id, 'PENALTY', 14, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_d_id, 'TRY', 38, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_2_id, v_team_d_id, 'CONVERSION', 39, FALSE, CURRENT_TIMESTAMP);

    -- Match 3: Team A 12 (2 tries, 1 conversion), Team C 12 (2 tries, 1 conversion)
    INSERT INTO match_events (id, match_id, team_id, event_type, event_minute, is_locked, created_at) VALUES
        -- Team A: 2 * 5 + 1 * 2 = 12
        (gen_random_uuid(), v_match_3_id, v_team_a_id, 'TRY', 18, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_3_id, v_team_a_id, 'CONVERSION', 19, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_3_id, v_team_a_id, 'TRY', 55, FALSE, CURRENT_TIMESTAMP),
        -- Team C: 2 * 5 + 1 * 2 = 12
        (gen_random_uuid(), v_match_3_id, v_team_c_id, 'TRY', 30, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_3_id, v_team_c_id, 'TRY', 70, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_3_id, v_team_c_id, 'CONVERSION', 71, FALSE, CURRENT_TIMESTAMP);

    -- Match 4: WALKOVER (28 - 0) -> deliberately NO match events!

    -- Match 5: Team A 24 (4 tries, 2 conversions), Team D 5 (1 try)
    INSERT INTO match_events (id, match_id, team_id, event_type, event_minute, is_locked, created_at) VALUES
        -- Team A: 4 * 5 + 2 * 2 = 24
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'TRY', 12, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'CONVERSION', 13, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'TRY', 34, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'TRY', 58, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'TRY', 75, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_5_id, v_team_a_id, 'CONVERSION', 76, FALSE, CURRENT_TIMESTAMP),
        -- Team D: 1 * 5 = 5
        (gen_random_uuid(), v_match_5_id, v_team_d_id, 'TRY', 44, FALSE, CURRENT_TIMESTAMP);

    -- Match 6: Team B 15 (3 tries), Team C 17 (3 tries, 1 conversion)
    INSERT INTO match_events (id, match_id, team_id, event_type, event_minute, is_locked, created_at) VALUES
        -- Team B: 3 * 5 = 15
        (gen_random_uuid(), v_match_6_id, v_team_b_id, 'TRY', 20, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_6_id, v_team_b_id, 'TRY', 42, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_6_id, v_team_b_id, 'TRY', 68, FALSE, CURRENT_TIMESTAMP),
        -- Team C: 3 * 5 + 1 * 2 = 17
        (gen_random_uuid(), v_match_6_id, v_team_c_id, 'TRY', 15, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_6_id, v_team_c_id, 'CONVERSION', 16, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_6_id, v_team_c_id, 'TRY', 35, FALSE, CURRENT_TIMESTAMP),
        (gen_random_uuid(), v_match_6_id, v_team_c_id, 'TRY', 78, FALSE, CURRENT_TIMESTAMP);

    RAISE NOTICE 'Successfully seeded bonus points sample tournament: % (ID: %)', 'Bonus Points Sample 15s', v_tournament_id;
END $$;
