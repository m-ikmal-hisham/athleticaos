-- V136__add_certifications_and_national_status.sql

ALTER TABLE persons ADD COLUMN national_player_status VARCHAR(50) DEFAULT 'NONE';
ALTER TABLE team_staff ADD COLUMN is_world_rugby_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE official_registry ADD COLUMN is_world_rugby_certified BOOLEAN DEFAULT FALSE;
