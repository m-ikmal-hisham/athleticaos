-- Add CHECK constraint on tournament_stages.stage_type
-- Ensures only recognized stage types can be stored, preventing typos
-- and making SHIELD an officially documented value.
--
-- Uses NOT VALID + VALIDATE pattern for production safety:
-- NOT VALID adds the constraint without scanning existing rows (no long lock)
-- VALIDATE then checks existing rows in a separate step

ALTER TABLE tournament_stages
    ADD CONSTRAINT chk_stage_type
    CHECK (stage_type IN (
        'POOL',
        'ROUND_OF_16',
        'QUARTER_FINAL',
        'SEMI_FINAL',
        'FINAL',
        'BOWL',
        'PLATE',
        'SHIELD',
        'THIRD_PLACE',
        'CLASSIFICATION',
        'SPOON',
        'FORK'
    )) NOT VALID;

ALTER TABLE tournament_stages VALIDATE CONSTRAINT chk_stage_type;
