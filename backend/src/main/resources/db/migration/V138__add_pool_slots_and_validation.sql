-- V138: Add pool_slot to tournament_teams and is_strictly_validated to tournament_format_configs

ALTER TABLE tournament_teams ADD COLUMN pool_slot INTEGER;
ALTER TABLE tournament_format_configs ADD COLUMN is_strictly_validated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN tournament_teams.pool_slot IS 'Specific slot index within a pool (e.g., 1 for Pool A Slot 1)';
COMMENT ON COLUMN tournament_format_configs.is_strictly_validated IS 'If true, match generation will be restricted if teams are not fully assigned to pools';
