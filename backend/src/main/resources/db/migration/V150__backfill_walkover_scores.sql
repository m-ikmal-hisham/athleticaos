-- Backfill the awarded scoreline for walkovers recorded before matches carried one.
--
-- Walkovers were originally stored with a winner but no score, on the reasoning that inventing
-- a scoreline would distort points for/against. In practice that left the result displaying as
-- 0-0 with no way to tell who had won, and any logic that derives a winner from scores saw a
-- draw. World Rugby awards a forfeit as a set scoreline and standings count it, so the score is
-- now recorded — this brings the earlier rows in line.
--
-- Scoped to rows that are unambiguous: a WALKOVER with a known winner, both teams present, and
-- at least one score missing. Byes are deliberately excluded — they have no opponent, so there
-- is no scoreline to award. Anything already scored is left untouched.

UPDATE matches
SET home_score = CASE WHEN winner_team_id = home_team_id THEN 28 ELSE 0 END,
    away_score = CASE WHEN winner_team_id = away_team_id THEN 28 ELSE 0 END
WHERE result_type = 'WALKOVER'
  AND winner_team_id IS NOT NULL
  AND home_team_id IS NOT NULL
  AND away_team_id IS NOT NULL
  AND (home_score IS NULL OR away_score IS NULL);
