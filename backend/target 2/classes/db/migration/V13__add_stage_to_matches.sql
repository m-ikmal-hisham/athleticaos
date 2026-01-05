-- Add stage reference to matches table
ALTER TABLE matches ADD COLUMN stage_id UUID REFERENCES tournament_stages(id) ON DELETE SET NULL;

-- Create index for faster match lookups by stage
CREATE INDEX idx_matches_stage_id ON matches(stage_id);
