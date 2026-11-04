-- Migration: V175__placement_round_robin.sql
-- Description: Add is_round_robin and first_place to tournament_stages for placement round robin stages.

ALTER TABLE tournament_stages
    ADD COLUMN IF NOT EXISTS is_round_robin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE tournament_stages
    ADD COLUMN IF NOT EXISTS first_place INTEGER;

