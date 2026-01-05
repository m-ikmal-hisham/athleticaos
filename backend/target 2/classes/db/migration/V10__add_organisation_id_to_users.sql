ALTER TABLE users ADD COLUMN organisation_id UUID REFERENCES organisations(id);
