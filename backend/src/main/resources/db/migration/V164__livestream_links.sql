-- Migration V164: several livestream links per tournament, and one per match
--
-- tournaments.livestream_links holds an ordered list of {"label", "url"} objects, so an event
-- streaming several pitches (or one channel per day) can list them all. The old single
-- tournaments.livestream_url column stays and is kept equal to the first link's url, so
-- anything still reading it (older clients, the tournament pill) keeps working. Nothing is
-- dropped here; retiring livestream_url can happen in a later cleanup once no reader is left.
--
-- matches.livestream_url is a match's own stream. When set it is shown on that match
-- instead of the tournament links.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS livestream_links JSONB;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS livestream_url VARCHAR(500);

-- Carry each existing single link over as the first (and only) entry.
UPDATE tournaments
SET livestream_links = jsonb_build_array(jsonb_build_object('label', NULL, 'url', TRIM(livestream_url)))
WHERE livestream_url IS NOT NULL
  AND TRIM(livestream_url) <> ''
  AND livestream_links IS NULL;
