-- Add identification fields to persons table
ALTER TABLE persons
ADD COLUMN identification_type VARCHAR(50),
ADD COLUMN identification_value VARCHAR(255);
