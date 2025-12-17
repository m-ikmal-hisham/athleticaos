-- Update match codes to be unique by prepending tournament slug
-- ONLY if the match code doesn't already start with the tournament slug

UPDATE matches
SET match_code = t.slug || '-' || matches.match_code
FROM tournaments t
WHERE matches.tournament_id = t.id
  AND matches.match_code NOT LIKE t.slug || '-%';
