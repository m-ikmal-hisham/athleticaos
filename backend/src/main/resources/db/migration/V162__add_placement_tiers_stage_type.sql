-- Migration: V162__add_placement_tiers_stage_type.sql
-- Description: Extend chk_stage_type CHECK constraint on tournament_stages to include
-- SAUCER, CHOPSTICK, WOODEN_SPOON, and WOODEN_FORK for 10-tier placement brackets.

ALTER TABLE tournament_stages DROP CONSTRAINT IF EXISTS chk_stage_type;

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
        'FORK',
        'SAUCER',
        'CHOPSTICK',
        'WOODEN_SPOON',
        'WOODEN_FORK'
    )) NOT VALID;

ALTER TABLE tournament_stages VALIDATE CONSTRAINT chk_stage_type;
