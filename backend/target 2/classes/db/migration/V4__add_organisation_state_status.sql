-- Add missing state and status columns to organisations table
ALTER TABLE organisations
ADD COLUMN state VARCHAR(50),
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active';

-- Add comment for clarity
COMMENT ON COLUMN organisations.state IS 'State/Region for the organisation';
COMMENT ON COLUMN organisations.status IS 'Organisation status: Active, Inactive';
