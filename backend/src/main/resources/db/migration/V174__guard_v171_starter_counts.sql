-- V174__guard_v171_starter_counts.sql
-- Restores pre-V171 lineup roles for any team where V171 produced an invalid starter count
-- (not in 7, 10, or 15) and altered the starter count from before V171.

-- 1. Add reverted_by_v174 flag to the V171 backup table
ALTER TABLE match_lineups_backup_v171
    ADD COLUMN IF NOT EXISTS reverted_by_v174 BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Identify target teams and backup rows to revert
CREATE TEMP TABLE v174_revert_targets AS
WITH backup_rows AS (
    -- Deduplicate backup entries by lineup id (taking earliest backup state if duplicate entries exist)
    SELECT DISTINCT ON (id)
        id, match_id, team_id, role, is_starter, backed_up_at
    FROM match_lineups_backup_v171
    WHERE reverted_by_v174 = FALSE
    ORDER BY id, backed_up_at ASC
),
backup_teams AS (
    SELECT DISTINCT match_id, team_id
    FROM backup_rows
),
current_starters AS (
    SELECT
        bt.match_id,
        bt.team_id,
        COUNT(CASE WHEN ml.role = 'STARTER' THEN 1 END) AS starters_after
    FROM backup_teams bt
    JOIN match_lineups ml
      ON ml.match_id = bt.match_id
     AND ml.team_id = bt.team_id
    GROUP BY bt.match_id, bt.team_id
),
backup_deltas AS (
    SELECT
        b.match_id,
        b.team_id,
        COUNT(CASE WHEN b.role = 'BENCH' AND ml.role = 'STARTER' THEN 1 END) -
        COUNT(CASE WHEN b.role = 'STARTER' AND ml.role = 'BENCH' THEN 1 END) AS delta
    FROM backup_rows b
    JOIN match_lineups ml
      ON ml.id = b.id
    GROUP BY b.match_id, b.team_id
),
teams_to_revert AS (
    SELECT
        cs.match_id,
        cs.team_id
    FROM current_starters cs
    JOIN backup_deltas bd
      ON cs.match_id = bd.match_id
     AND cs.team_id = bd.team_id
    WHERE cs.starters_after NOT IN (7, 10, 15)
      AND cs.starters_after <> (cs.starters_after - bd.delta)
)
SELECT
    b.id,
    b.match_id,
    b.team_id,
    b.role,
    b.is_starter
FROM backup_rows b
JOIN teams_to_revert t
  ON b.match_id = t.match_id
 AND b.team_id = t.team_id;

-- 3. Restore match_lineups for affected teams to their backed-up pre-V171 state
UPDATE match_lineups ml
SET
    role = t.role,
    is_starter = t.is_starter,
    updated_at = NOW()
FROM v174_revert_targets t
WHERE ml.id = t.id;

-- 4. Mark backup rows as reverted
UPDATE match_lineups_backup_v171 b
SET reverted_by_v174 = TRUE
FROM v174_revert_targets t
WHERE b.id = t.id;

-- 5. Clean up temporary table
DROP TABLE IF EXISTS v174_revert_targets;
