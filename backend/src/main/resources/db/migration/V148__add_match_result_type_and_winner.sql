-- Bye and walkover support.
--
-- Until now a match result could only be expressed as a pair of scores, so:
--   * a bye (one team, no opponent) sat SCHEDULED forever and never advanced anyone;
--   * a forfeit had to be faked by typing an invented scoreline.
--
-- result_type records HOW a result came about, and winner_team_id records WHO won when
-- there are no scores to derive it from. Both are nullable and default to the existing
-- behaviour (NULL result_type == a normally played match), so existing rows are correct
-- as-is and no backfill is required.
--
-- Uses the NOT VALID + VALIDATE pattern for production safety, matching V146/V147.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_type VARCHAR(20);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_team_id UUID;

-- Constrain to recognised values without scanning existing rows first.
ALTER TABLE matches
    ADD CONSTRAINT chk_match_result_type
    CHECK (result_type IS NULL OR result_type IN (
        'NORMAL',
        'WALKOVER',
        'BYE'
    )) NOT VALID;

ALTER TABLE matches VALIDATE CONSTRAINT chk_match_result_type;

-- Referential integrity for the explicit winner, mirroring home_team_id / away_team_id.
ALTER TABLE matches
    ADD CONSTRAINT fk_matches_winner_team
    FOREIGN KEY (winner_team_id) REFERENCES teams(id)
    ON DELETE SET NULL
    NOT VALID;

ALTER TABLE matches VALIDATE CONSTRAINT fk_matches_winner_team;

CREATE INDEX IF NOT EXISTS idx_matches_winner_team_id ON matches(winner_team_id);
