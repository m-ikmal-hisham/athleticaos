-- Add missing division, state, and status columns to teams table
ALTER TABLE teams
ADD COLUMN division VARCHAR(50),
ADD COLUMN state VARCHAR(50),
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active';

-- Add comments for clarity
COMMENT ON COLUMN teams.division IS 'Division level: Premier, Division 1, Division 2, School';
COMMENT ON COLUMN teams.state IS 'State/Region for the team';
COMMENT ON COLUMN teams.status IS 'Team status: Active, Inactive';
