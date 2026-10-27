-- V171__restore_original_lineup_roles.sql
-- Restores original STARTER / BENCH roles in match_lineups that were mutated by automatic substitution updates.

-- 1. Create backup table to record any rows modified by this migration
CREATE TABLE IF NOT EXISTS match_lineups_backup_v171 (
    id UUID,
    match_id UUID,
    team_id UUID,
    player_id UUID,
    role VARCHAR(50),
    is_starter BOOLEAN,
    order_index INTEGER,
    backed_up_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ordering: minute (null = 0), then created_at.
CREATE TEMP TABLE v171_targets AS
WITH sub_involvements AS (
    -- Player subbed OFF: earliest involvement indicates they were a STARTER
    SELECT
        match_id,
        team_id,
        player_id AS player_id,
        'STARTER' AS original_role,
        event_minute,
        created_at
    FROM match_events
    WHERE event_type = 'SUBSTITUTION'
      AND player_id IS NOT NULL

    UNION ALL

    -- Player subbed ON: earliest involvement indicates they were on the BENCH
    SELECT
        match_id,
        team_id,
        related_player_id AS player_id,
        'BENCH' AS original_role,
        event_minute,
        created_at
    FROM match_events
    WHERE event_type = 'SUBSTITUTION'
      AND related_player_id IS NOT NULL
),
earliest_involvement AS (
    SELECT
        match_id,
        team_id,
        player_id,
        original_role,
        ROW_NUMBER() OVER (
            PARTITION BY match_id, team_id, player_id
            ORDER BY COALESCE(event_minute, 0) ASC, created_at ASC
        ) AS rn
    FROM sub_involvements
),
player_original_roles AS (
    SELECT
        match_id,
        team_id,
        player_id,
        original_role
    FROM earliest_involvement
    WHERE rn = 1
)
SELECT
    ml.id,
    ml.match_id,
    ml.team_id,
    ml.player_id,
    ml.role AS old_role,
    ml.is_starter AS old_is_starter,
    ml.order_index,
    por.original_role AS new_role,
    (por.original_role = 'STARTER') AS new_is_starter
FROM match_lineups ml
JOIN player_original_roles por
  ON ml.match_id = por.match_id
 AND ml.team_id = por.team_id
 AND ml.player_id = por.player_id
WHERE (
    (por.original_role = 'STARTER' AND ml.role = 'BENCH')
    OR
    (por.original_role = 'BENCH' AND ml.role = 'STARTER')
)
AND (
    ml.role <> por.original_role
    OR ml.is_starter IS DISTINCT FROM (por.original_role = 'STARTER')
);

-- 2. Back up affected rows
INSERT INTO match_lineups_backup_v171 (id, match_id, team_id, player_id, role, is_starter, order_index, backed_up_at)
SELECT
    id,
    match_id,
    team_id,
    player_id,
    old_role,
    old_is_starter,
    order_index,
    NOW()
FROM v171_targets;

-- 3. Update match_lineups from computed targets
UPDATE match_lineups ml
SET
    role = t.new_role,
    is_starter = t.new_is_starter,
    updated_at = NOW()
FROM v171_targets t
WHERE ml.id = t.id;

-- 4. Clean up temporary table
DROP TABLE IF EXISTS v171_targets;
