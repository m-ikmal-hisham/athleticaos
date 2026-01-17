ALTER TABLE match_events
ADD COLUMN related_player_id UUID;

ALTER TABLE match_events
ADD CONSTRAINT fk_match_events_related_player
FOREIGN KEY (related_player_id)
REFERENCES players(id);
