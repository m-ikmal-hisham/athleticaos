-- V176__knockout_tie_breakers.sql
-- Add knockout tie-break configuration to tournament format configs and decision fields to matches

ALTER TABLE tournament_format_configs
    ADD COLUMN IF NOT EXISTS knockout_tie_breaker VARCHAR(32),
    ADD COLUMN IF NOT EXISTS extra_time_minutes INTEGER;

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS decided_by VARCHAR(32),
    ADD COLUMN IF NOT EXISTS drop_kicks_home INTEGER,
    ADD COLUMN IF NOT EXISTS drop_kicks_away INTEGER;

COMMENT ON COLUMN matches.decided_by IS 'FIRST_TRY, EXTRA_TIME, DROP_KICKS, COIN_TOSS. Null when decided on normal scores.';
COMMENT ON COLUMN matches.drop_kicks_home IS 'Drop kicks scored by home team in tie-break tally';
COMMENT ON COLUMN matches.drop_kicks_away IS 'Drop kicks scored by away team in tie-break tally';

