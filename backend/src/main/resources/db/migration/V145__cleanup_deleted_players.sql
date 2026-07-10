-- Create a temp table to hold the person_ids and player_ids of players to delete
CREATE TEMP TABLE temp_players_to_delete AS
SELECT p.id AS player_id, p.person_id
FROM players p
WHERE p.deleted = true
  AND NOT EXISTS (SELECT 1 FROM match_lineups ml WHERE ml.player_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM match_events me WHERE me.player_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM match_events me WHERE me.related_player_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM player_suspensions ps WHERE ps.player_id = p.id);

-- Delete from player_teams
DELETE FROM player_teams
WHERE player_id IN (SELECT player_id FROM temp_players_to_delete);

-- Delete from tournament_players
DELETE FROM tournament_players
WHERE player_id IN (SELECT player_id FROM temp_players_to_delete);

-- Delete from players
DELETE FROM players
WHERE id IN (SELECT player_id FROM temp_players_to_delete);

-- Delete from organisation_persons
DELETE FROM organisation_persons
WHERE person_id IN (
    SELECT person_id FROM temp_players_to_delete
    WHERE person_id NOT IN (
        SELECT id FROM persons WHERE user_id IS NOT NULL OR is_staff = true
    )
    AND person_id NOT IN (SELECT person_id FROM team_staff)
    AND person_id NOT IN (SELECT person_id FROM tournament_staff)
    AND person_id NOT IN (SELECT person_id FROM official_registry WHERE person_id IS NOT NULL)
);

-- Delete from persons
DELETE FROM persons
WHERE id IN (
    SELECT person_id FROM temp_players_to_delete
    WHERE person_id NOT IN (
        SELECT id FROM persons WHERE user_id IS NOT NULL OR is_staff = true
    )
    AND id NOT IN (SELECT person_id FROM team_staff)
    AND id NOT IN (SELECT person_id FROM tournament_staff)
    AND id NOT IN (SELECT person_id FROM official_registry WHERE person_id IS NOT NULL)
);

-- Drop the temp table
DROP TABLE temp_players_to_delete;
