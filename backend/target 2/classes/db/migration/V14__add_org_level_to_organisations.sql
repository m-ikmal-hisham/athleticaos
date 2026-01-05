-- Add org_level column to organisations table
ALTER TABLE organisations ADD COLUMN org_level VARCHAR(50) NOT NULL DEFAULT 'CLUB';

-- Add comment to the column
COMMENT ON COLUMN organisations.org_level IS 'Organisation hierarchy level: COUNTRY, STATE, DIVISION, DISTRICT, CLUB, SCHOOL';
