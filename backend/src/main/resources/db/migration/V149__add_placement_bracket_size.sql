-- Persist "teams per placement bracket" alongside the rest of the format configuration.
--
-- The setting previously travelled only on the generation request, so it was lost the moment
-- the Format & Stages tab remounted: the control silently snapped back to 4 while the
-- generated brackets were still 8, which reads as the tournament being configured one way and
-- built another.
--
-- Nullable with no default so existing rows keep working — the generator falls back to 4
-- (DEFAULT_PLACEMENT_BRACKET_SIZE) when this is null, exactly as it did before.

ALTER TABLE tournament_format_configs
    ADD COLUMN IF NOT EXISTS placement_bracket_size INTEGER;

-- Only sizes that produce a well-formed bracket. 2 is the floor (a bracket needs two slots);
-- larger values must be powers of two or rounds cannot halve cleanly.
ALTER TABLE tournament_format_configs
    ADD CONSTRAINT chk_placement_bracket_size
    CHECK (placement_bracket_size IS NULL OR placement_bracket_size IN (2, 4, 8, 16, 32))
    NOT VALID;

ALTER TABLE tournament_format_configs VALIDATE CONSTRAINT chk_placement_bracket_size;
