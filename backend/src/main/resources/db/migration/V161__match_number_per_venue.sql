-- Migration V161: Match numbers run per venue instead of per tournament
--
-- Modifies match numbering so each venue within a tournament maintains its own
-- sequential numbering (1, 2, 3, ...). Matches with NULL or blank venue are
-- normalised to empty string '' and share the single unassigned sequence.
--
-- Existing match numbers were unique per tournament (uq_matches_tournament_match_number),
-- so they are already unique per (tournament_id, venue, match_number).
-- Therefore, existing match numbers remain untouched and valid without data loss or rewriting.

CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_tournament_venue_match_number
    ON matches (tournament_id, COALESCE(NULLIF(TRIM(venue), ''), ''), match_number)
    WHERE deleted = false;

DROP INDEX IF EXISTS uq_matches_tournament_match_number;
