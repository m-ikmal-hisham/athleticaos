CREATE TABLE IF NOT EXISTS tournament_format_configs (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL UNIQUE,
    format_type VARCHAR(50) NOT NULL,
    rugby_format VARCHAR(50) NOT NULL,
    team_count INTEGER NOT NULL,
    pool_count INTEGER,
    match_duration_minutes INTEGER NOT NULL,
    points_win INTEGER NOT NULL DEFAULT 4,
    points_draw INTEGER NOT NULL DEFAULT 2,
    points_loss INTEGER NOT NULL DEFAULT 0,
    points_bonus_try INTEGER DEFAULT 1,
    points_bonus_loss INTEGER DEFAULT 1,
    starters_count INTEGER NOT NULL DEFAULT 15,
    max_bench_count INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_tournament_format_config_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- Ensure columns exist if table already existed (idempotency)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_format_configs' AND column_name = 'starters_count') THEN
        ALTER TABLE tournament_format_configs ADD COLUMN starters_count INTEGER NOT NULL DEFAULT 15;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_format_configs' AND column_name = 'max_bench_count') THEN
        ALTER TABLE tournament_format_configs ADD COLUMN max_bench_count INTEGER NOT NULL DEFAULT 8;
    END IF;
END $$;
