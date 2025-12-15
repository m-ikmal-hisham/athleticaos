-- V35: Clean slate - Remove all user data except super admin and org hierarchy

-- Remove all match events
DELETE FROM match_events;

-- Remove all matches
DELETE FROM matches;

-- Remove all tournament teams
DELETE FROM tournament_teams;

-- Remove all tournament players
DELETE FROM tournament_players;

-- Remove all tournament stages
DELETE FROM tournament_stages;

-- Remove all tournaments
DELETE FROM tournaments;

-- Remove all seasons
DELETE FROM season;

-- Remove all player suspensions
DELETE FROM player_suspensions;

-- Remove all player season lifecycles
DELETE FROM player_season_lifecycles;

-- Remove all player teams
DELETE FROM player_teams;

-- Remove all team players
DELETE FROM team_players;

-- Remove all players
DELETE FROM players;

-- Remove all persons
DELETE FROM persons;

-- Remove all teams
DELETE FROM teams;

-- Remove all events
DELETE FROM events;

-- Remove all audit logs
DELETE FROM audit_log;

-- Remove all user organisations (except super admin's)
DELETE FROM user_organisations 
WHERE user_id NOT IN (
    SELECT id FROM users WHERE email = 'admin@athleticaos.com'
);

-- Remove all users except super admin
DELETE FROM users WHERE email != 'admin@athleticaos.com';

-- Remove all theme configs
DELETE FROM theme_configs;

-- Keep the organization hierarchy from OrganisationSeedConfig
-- This preserves Malaysia, States, Mukah Division, Mukah District, Mukah Rugby Club, SMK Mukah Rugby
-- All organizations are kept for structure, but all their data (teams, players, etc.) is removed
