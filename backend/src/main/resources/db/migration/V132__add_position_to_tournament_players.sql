-- Create Migration for AOS-011
ALTER TABLE tournament_players ADD COLUMN position VARCHAR(255);
