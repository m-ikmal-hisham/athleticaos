-- V173__bonus_points_settings.sql
-- Add bonus points configuration to tournament format configs

ALTER TABLE tournament_format_configs
    ADD COLUMN IF NOT EXISTS bonus_points_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bonus_try_threshold INTEGER NOT NULL DEFAULT 4,
    ADD COLUMN IF NOT EXISTS bonus_losing_margin INTEGER NOT NULL DEFAULT 7;
