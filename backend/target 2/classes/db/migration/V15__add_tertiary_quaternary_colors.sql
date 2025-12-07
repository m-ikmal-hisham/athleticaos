-- Add tertiary_color and quaternary_color columns to organisations table
ALTER TABLE organisations ADD COLUMN tertiary_color VARCHAR(7);
ALTER TABLE organisations ADD COLUMN quaternary_color VARCHAR(7);

-- Add comments to the columns
COMMENT ON COLUMN organisations.tertiary_color IS 'Third brand color in hex format';
COMMENT ON COLUMN organisations.quaternary_color IS 'Fourth brand color in hex format';
