-- Add tournament bracket configuration fields
ALTER TABLE tournaments ADD COLUMN format VARCHAR(50);
ALTER TABLE tournaments ADD COLUMN number_of_pools INTEGER;
ALTER TABLE tournaments ADD COLUMN has_placement_stages BOOLEAN DEFAULT false;
