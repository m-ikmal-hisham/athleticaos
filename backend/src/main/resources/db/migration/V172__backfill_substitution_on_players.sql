-- V172__backfill_substitution_on_players.sql
-- Older SUBSTITUTION events were saved without related_player_id (the player coming on); only the
-- notes name him ("OUT: <name> | IN: <name>"). V171 could therefore restore the player who went off
-- to STARTER but not the player who came on to BENCH. This fills related_player_id from the notes
-- when the name matches exactly one player in that team's lineup for that match, then applies the
-- V171 rule again (same ordering: minute (null = 0), then created_at). Idempotent.

-- 1. Backup of the events this changes
CREATE TABLE IF NOT EXISTS match_events_backup_v172 (
    id UUID,
    match_id UUID,
    team_id UUID,
    related_player_id UUID,
    notes TEXT,
    backed_up_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TEMP TABLE v172_event_targets AS
WITH parsed AS (
    SELECT e.id, e.match_id, e.team_id,
           btrim(substring(e.notes FROM ' \| IN: (.*)$')) AS in_name
    FROM match_events e
    WHERE e.event_type = 'SUBSTITUTION'
      AND e.related_player_id IS NULL
      AND e.notes LIKE '% | IN: %'
),
candidates AS (
    SELECT p.id AS event_id, ml.player_id
    FROM parsed p
    JOIN match_lineups ml ON ml.match_id = p.match_id AND ml.team_id = p.team_id
    JOIN players pl ON pl.id = ml.player_id
    JOIN persons pe ON pe.id = pl.person_id
    WHERE lower(btrim(pe.first_name || ' ' || pe.last_name)) = lower(p.in_name)
)
SELECT event_id, MIN(player_id::text)::uuid AS player_id
FROM candidates
GROUP BY event_id
HAVING COUNT(*) = 1;

INSERT INTO match_events_backup_v172 (id, match_id, team_id, related_player_id, notes, backed_up_at)
SELECT e.id, e.match_id, e.team_id, e.related_player_id, e.notes, NOW()
FROM match_events e
JOIN v172_event_targets t ON t.event_id = e.id;

UPDATE match_events e
SET related_player_id = t.player_id
FROM v172_event_targets t
WHERE e.id = t.event_id;

DROP TABLE IF EXISTS v172_event_targets;

-- 2. Apply the V171 restore rule again now that the players coming on are known
CREATE TEMP TABLE v172_lineup_targets AS
WITH sub_involvements AS (
    SELECT match_id, team_id, player_id AS player_id, 'STARTER' AS original_role, event_minute, created_at
    FROM match_events
    WHERE event_type = 'SUBSTITUTION' AND player_id IS NOT NULL
    UNION ALL
    SELECT match_id, team_id, related_player_id AS player_id, 'BENCH' AS original_role, event_minute, created_at
    FROM match_events
    WHERE event_type = 'SUBSTITUTION' AND related_player_id IS NOT NULL
),
earliest AS (
    SELECT match_id, team_id, player_id, original_role,
           ROW_NUMBER() OVER (PARTITION BY match_id, team_id, player_id
                              ORDER BY COALESCE(event_minute, 0) ASC, created_at ASC) AS rn
    FROM sub_involvements
)
SELECT ml.id, ml.match_id, ml.team_id, ml.player_id,
       ml.role AS old_role, ml.is_starter AS old_is_starter, ml.order_index,
       e.original_role AS new_role, (e.original_role = 'STARTER') AS new_is_starter
FROM match_lineups ml
JOIN earliest e
  ON e.rn = 1 AND e.match_id = ml.match_id AND e.team_id = ml.team_id AND e.player_id = ml.player_id
WHERE (e.original_role = 'STARTER' AND ml.role = 'BENCH')
   OR (e.original_role = 'BENCH' AND ml.role = 'STARTER');

-- Same backup table as V171, so one table holds every lineup row these two migrations changed
INSERT INTO match_lineups_backup_v171 (id, match_id, team_id, player_id, role, is_starter, order_index, backed_up_at)
SELECT id, match_id, team_id, player_id, old_role, old_is_starter, order_index, NOW()
FROM v172_lineup_targets;

UPDATE match_lineups ml
SET role = t.new_role,
    is_starter = t.new_is_starter,
    updated_at = NOW()
FROM v172_lineup_targets t
WHERE ml.id = t.id;

DROP TABLE IF EXISTS v172_lineup_targets;
