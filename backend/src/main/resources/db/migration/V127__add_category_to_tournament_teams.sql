ALTER TABLE tournament_teams
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id);
