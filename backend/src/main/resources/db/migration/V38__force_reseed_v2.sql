-- V38: Cleanup organisations again to force re-seeding with updated seed config (state & state_code)
-- Unlink super admin from any organisation first to avoid FK violations
UPDATE users SET organisation_id = NULL WHERE email = 'admin@athleticaos.com';

-- Delete all organisations
DELETE FROM user_organisations; -- Clear mapping table
DELETE FROM organisations;

-- Seed config will run on startup and populate organisations with correct 'state' and 'state_code' fields.
