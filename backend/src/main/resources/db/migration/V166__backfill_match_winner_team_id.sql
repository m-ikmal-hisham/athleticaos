-- Backfill winner_team_id for completed matches that were decided on the scoreboard.
--
-- V148 added winner_team_id on 2026-08-06 so that byes and walkovers could record a winner
-- without a scoreline. Derivation for normally played matches only arrived on 2026-09-12, so
-- every match completed before that date still has the column empty: on staging, 313 matches
-- across ten tournaments, while every tournament created after that date has it set on all rows.
--
-- Nothing is broken today. Every reader falls back to the scoreline for a normally played match
-- (ProgressionServiceImpl.determineWinner, the pool standings in BracketServiceImpl, and the
-- frontend), and the stored winner is only authoritative for BYE and WALKOVER. This backfill
-- simply makes the column agree with the scoreline everywhere, so later reporting can read it
-- directly instead of re-deriving it.
--
-- Deliberately narrow:
--   * only COMPLETED matches that were actually played (result_type NULL or NORMAL) — byes and
--     walkovers are left exactly as they are, because their winner cannot be derived from scores;
--   * only decisive scorelines — a draw correctly has no winner;
--   * only rows where the winner is still missing, so re-running changes nothing;
--   * result_type is left untouched: NULL already reads as NORMAL everywhere in the code, and
--     leaving it alone keeps this change to one column.
--
-- Idempotent and a no-op on a database that has no such rows.

UPDATE matches
SET winner_team_id = CASE
        WHEN home_score > away_score THEN home_team_id
        ELSE away_team_id
    END
WHERE deleted = false
  AND status = 'COMPLETED'
  AND COALESCE(result_type, 'NORMAL') = 'NORMAL'
  AND winner_team_id IS NULL
  AND home_team_id IS NOT NULL
  AND away_team_id IS NOT NULL
  AND home_score IS NOT NULL
  AND away_score IS NOT NULL
  AND home_score <> away_score;
