-- Backfill min_year and max_year for existing categories based on tournament start date
-- Logic: 
-- Min Year (Latest Birth Year for Max Age) = Season Year - Max Age
-- Max Year (Earliest Birth Year for Min Age) = Season Year - Min Age
-- Example: Season 2026. U18 (Max Age 18). Min Year = 2026 - 18 = 2008. (Born 2008 or later? No, born 2008 turn 18. Born 2009 is 17. Born 2007 is 19.)
-- Wait, usually Year Constraints are "Born In or After X".
-- If Max Age is 18 (cannot be 19).
-- Born 2007: Age 19 (in 2026). Too old.
-- Born 2008: Age 18 (in 2026). Eligible.
-- So Earliest Birth Year (Min Year) = 2008. 
-- Correct Formula: min_year = Year(StartDate) - max_age.

-- If Min Age is 16 (must be at least 16).
-- Born 2010: Age 16 (in 2026). Eligible.
-- Born 2011: Age 15 (in 2026). Too young.
-- So Latest Birth Year (Max Year) = 2010.
-- Correct Formula: max_year = Year(StartDate) - min_age.

UPDATE tournament_categories tc
SET
    min_year = (EXTRACT(YEAR FROM t.start_date) - tc.max_age),
    max_year = (EXTRACT(YEAR FROM t.start_date) - tc.min_age)
FROM tournaments t
WHERE tc.tournament_id = t.id
  AND tc.min_year IS NULL
  AND tc.max_year IS NULL
  AND tc.min_age IS NOT NULL
  AND tc.max_age IS NOT NULL
  AND t.start_date IS NOT NULL;
