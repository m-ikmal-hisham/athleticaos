-- Migration V165: retire tournaments.livestream_url
--
-- Since V164 the tournament's streams live in tournaments.livestream_links (a JSON list), and the
-- application has kept livestream_url equal to the first link's url. Nothing reads the column any
-- more: the API's single livestreamUrl field is now worked out from the first link.
--
-- The column is only dropped after making sure no link is lost. This never fails the deploy: the
-- list is the source of truth, and a row that somehow only has the old column gets it copied in first.

-- 1. A row with an old single link but no list (written outside the application): keep the link.
UPDATE tournaments
SET livestream_links = jsonb_build_array(jsonb_build_object('label', NULL, 'url', TRIM(livestream_url)))
WHERE livestream_url IS NOT NULL
  AND TRIM(livestream_url) <> ''
  AND (livestream_links IS NULL OR jsonb_array_length(livestream_links) = 0);

-- 2. Drop the column.
ALTER TABLE tournaments DROP COLUMN IF EXISTS livestream_url;
