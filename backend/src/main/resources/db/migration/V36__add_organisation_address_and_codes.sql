-- Add address structure fields to organisations table
ALTER TABLE organisations
ADD COLUMN address_line1 VARCHAR(255),
ADD COLUMN address_line2 VARCHAR(255),
ADD COLUMN postcode VARCHAR(20),
ADD COLUMN city VARCHAR(100),
ADD COLUMN state_code VARCHAR(10),
ADD COLUMN country_code VARCHAR(10);

-- Add comments for documentation
COMMENT ON COLUMN organisations.address_line1 IS 'Address Line 1';
COMMENT ON COLUMN organisations.address_line2 IS 'Address Line 2';
COMMENT ON COLUMN organisations.postcode IS 'Postal Code / Zip Code';
COMMENT ON COLUMN organisations.city IS 'City or District Name';
COMMENT ON COLUMN organisations.state_code IS 'State Code (e.g. MY-01 for Johor, MY-13 for Sarawak)';
COMMENT ON COLUMN organisations.country_code IS 'Country Code (e.g. MY)';
