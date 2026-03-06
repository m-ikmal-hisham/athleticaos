ALTER TABLE matches
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id),
ADD COLUMN IF NOT EXISTS next_match_id_for_winner UUID,
ADD COLUMN IF NOT EXISTS next_match_id_for_loser UUID,
ADD COLUMN IF NOT EXISTS winner_slot VARCHAR(255),
ADD COLUMN IF NOT EXISTS loser_slot VARCHAR(255),
ADD COLUMN IF NOT EXISTS home_team_placeholder VARCHAR(255),
ADD COLUMN IF NOT EXISTS away_team_placeholder VARCHAR(255);
