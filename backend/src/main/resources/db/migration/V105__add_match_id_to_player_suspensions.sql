ALTER TABLE player_suspensions ADD COLUMN match_id UUID;
ALTER TABLE player_suspensions ADD CONSTRAINT fk_player_suspensions_match FOREIGN KEY (match_id) REFERENCES matches(id);
CREATE INDEX idx_player_suspension_match ON player_suspensions(match_id);
