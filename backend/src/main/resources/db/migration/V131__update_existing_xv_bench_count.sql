-- Update existing Tournament Format Configs for XV Rugby where max_bench_count is 8 (the old default).
-- Since XV rugby standard supports 10 bench players, we'll bump existing rows to 10.
-- We won't touch other rugby formats like SEVENS (which has 5) or TENS (which has 7).

UPDATE tournament_format_configs
SET max_bench_count = 10
WHERE rugby_format = 'XV' 
  AND max_bench_count = 8;
