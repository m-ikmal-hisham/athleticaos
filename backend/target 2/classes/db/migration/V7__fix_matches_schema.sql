-- Add new columns
ALTER TABLE matches ADD COLUMN home_score INT;
ALTER TABLE matches ADD COLUMN away_score INT;
ALTER TABLE matches ADD COLUMN phase VARCHAR(50);
ALTER TABLE matches ADD COLUMN match_code VARCHAR(50);
ALTER TABLE matches ADD COLUMN updated_at TIMESTAMP;
ALTER TABLE matches ADD COLUMN match_date DATE;
ALTER TABLE matches ADD COLUMN kick_off_time TIME;
ALTER TABLE matches ADD COLUMN pitch VARCHAR(50);

-- Migrate data (simple approximation if needed, otherwise just set defaults or nulls)
-- For now, we assume empty or we just set defaults.
-- Since we are adding NOT NULL columns in Java (matchDate, kickOffTime), we should populate them if there are existing rows.
-- But for a fresh dev setup, it's fine. If there are rows, this might fail if we add NOT NULL constraint immediately.
-- Match.java says nullable=false for matchDate and kickOffTime.
-- So we should update them.

UPDATE matches SET match_date = CURRENT_DATE WHERE match_date IS NULL;
UPDATE matches SET kick_off_time = '12:00:00' WHERE kick_off_time IS NULL;

-- Now apply NOT NULL constraints
ALTER TABLE matches ALTER COLUMN match_date SET NOT NULL;
ALTER TABLE matches ALTER COLUMN kick_off_time SET NOT NULL;

-- Drop old columns that are no longer in Entity
ALTER TABLE matches DROP COLUMN start_time;
ALTER TABLE matches DROP COLUMN field_number;
ALTER TABLE matches DROP COLUMN winner_team_id;
