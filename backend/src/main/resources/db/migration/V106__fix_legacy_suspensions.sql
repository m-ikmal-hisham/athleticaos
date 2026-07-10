-- Migration to fix legacy suspensions by populating match_id from text reason
-- Attempts to parse 'piala-agong-...' style slugs from the reason column
-- and link to the corresponding match_id

UPDATE player_suspensions ps
SET match_id = m.id
FROM matches m
WHERE ps.match_id IS NULL
  AND ps.reason LIKE '%One match suspension for red card in match %'
  AND m.match_code = substring(ps.reason from 'in match (.*)$');

UPDATE player_suspensions ps
SET match_id = m.id
FROM matches m
WHERE ps.match_id IS NULL
  AND ps.reason LIKE '%Two yellow cards in match %'
  AND m.match_code = substring(ps.reason from 'in match (.*)$');
