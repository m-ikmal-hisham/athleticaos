-- V137__add_user_id_to_persons.sql

ALTER TABLE persons ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_persons_user_id ON persons(user_id);
