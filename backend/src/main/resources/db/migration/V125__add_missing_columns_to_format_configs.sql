ALTER TABLE tournament_format_configs
ADD COLUMN IF NOT EXISTS buffer_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS carnival_start_time TIME,
ADD COLUMN IF NOT EXISTS carnival_end_time TIME,
ADD COLUMN IF NOT EXISTS is_one_way_match BOOLEAN DEFAULT FALSE;
