-- Add a sequential match number per tournament for easier identification.
--
-- Every match in a tournament gets an ordinal (1, 2, 3, …) assigned at creation
-- time. This makes it trivial to refer to "Match 7" in conversation, on the
-- schedule board, or in dropdown selectors — instead of parsing the slug-based
-- matchCode.
--
-- Nullable so that the column can be added without a default, then backfilled
-- for existing rows before the unique constraint is applied.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_number INTEGER;

-- Backfill existing rows: number each tournament's matches sequentially by creation order.
WITH numbered AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY tournament_id
               ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM matches
    WHERE match_number IS NULL
)
UPDATE matches
SET match_number = numbered.rn
FROM numbered
WHERE matches.id = numbered.id;

-- Unique constraint: no two non-deleted matches in the same tournament share a number.
-- Using a partial unique index so soft-deleted rows don't block new numbers.
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_tournament_match_number
    ON matches (tournament_id, match_number)
    WHERE deleted = false;
