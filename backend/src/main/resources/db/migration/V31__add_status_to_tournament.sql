ALTER TABLE tournaments ADD COLUMN status VARCHAR(20);

UPDATE tournaments SET status = 'DRAFT' WHERE is_published = false;
UPDATE tournaments SET status = 'PUBLISHED' WHERE is_published = true AND start_date > CURRENT_DATE;
UPDATE tournaments SET status = 'LIVE' WHERE is_published = true AND CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date;
UPDATE tournaments SET status = 'COMPLETED' WHERE is_published = true AND end_date < CURRENT_DATE;

-- catch all nulls (e.g. edge cases)
UPDATE tournaments SET status = 'DRAFT' WHERE status IS NULL;

ALTER TABLE tournaments ALTER COLUMN status SET NOT NULL;
