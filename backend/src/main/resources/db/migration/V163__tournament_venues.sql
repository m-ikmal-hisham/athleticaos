-- Migration V163: Tournament Venue Registry
--
-- Declares venues per tournament up front and replaces free-text matches.venue
-- with a foreign key reference to tournament_venues(id).

CREATE TABLE tournament_venues (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    name          VARCHAR(255) NOT NULL,
    short_name    VARCHAR(50),
    display_order INT NOT NULL DEFAULT 0,
    deleted       BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP
);

CREATE UNIQUE INDEX uq_tournament_venue_name
    ON tournament_venues (tournament_id, LOWER(TRIM(name)))
    WHERE deleted = false;

ALTER TABLE matches ADD COLUMN venue_id UUID REFERENCES tournament_venues(id);
CREATE INDEX idx_matches_venue_id ON matches (venue_id);

-- 1a. Backfill tournament_venues from distinct matches.venue values,
-- one row per (tournament_id, TRIM(venue)) where venue is non-blank.
-- Order display_order by name.
INSERT INTO tournament_venues (id, tournament_id, name, display_order, created_at)
SELECT
    gen_random_uuid(),
    sub.tournament_id,
    sub.venue_name,
    ROW_NUMBER() OVER (PARTITION BY sub.tournament_id ORDER BY sub.venue_name) - 1,
    now()
FROM (
    SELECT DISTINCT ON (tournament_id, LOWER(TRIM(venue)))
        tournament_id,
        TRIM(venue) AS venue_name
    FROM matches
    WHERE venue IS NOT NULL
      AND TRIM(venue) <> ''
    ORDER BY tournament_id, LOWER(TRIM(venue)), venue ASC
) sub;

-- 1b. Only for tournaments that have NO match with a non-blank venue,
-- insert a single row from tournaments.venue.
INSERT INTO tournament_venues (id, tournament_id, name, display_order, created_at)
SELECT
    gen_random_uuid(),
    t.id,
    TRIM(t.venue),
    0,
    now()
FROM tournaments t
WHERE NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.tournament_id = t.id
      AND m.venue IS NOT NULL
      AND TRIM(m.venue) <> ''
)
AND t.venue IS NOT NULL
AND TRIM(t.venue) <> '';

-- 1c. Backfill matches.venue_id by matching TRIM(matches.venue) to TRIM(tournament_venues.name)
-- within the same tournament, case-insensitively.
UPDATE matches m
SET venue_id = tv.id
FROM tournament_venues tv
WHERE m.tournament_id = tv.tournament_id
  AND m.venue IS NOT NULL
  AND TRIM(m.venue) <> ''
  AND LOWER(TRIM(m.venue)) = LOWER(TRIM(tv.name));

-- 1d. Repoint the numbering index at venue_id:
DROP INDEX IF EXISTS uq_matches_tournament_venue_match_number;
CREATE UNIQUE INDEX uq_matches_tournament_venue_id_match_number
    ON matches (tournament_id,
                COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid),
                match_number)
    WHERE deleted = false;

-- 1e. Verify before finishing: every match that had a non-blank venue must end up with a non-null venue_id.
DO $$
DECLARE
    unmatched_count INT;
BEGIN
    SELECT COUNT(*)
    INTO unmatched_count
    FROM matches
    WHERE venue IS NOT NULL
      AND TRIM(venue) <> ''
      AND venue_id IS NULL;

    IF unmatched_count > 0 THEN
        RAISE EXCEPTION 'Migration assertion failed: % matches with non-blank venue have null venue_id', unmatched_count;
    END IF;
END $$;
