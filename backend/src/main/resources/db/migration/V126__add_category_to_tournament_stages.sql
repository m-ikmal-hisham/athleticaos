ALTER TABLE tournament_stages
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES tournament_categories(id);
