-- V37: Cleanup organisations to trigger re-seed
-- Unlink super admin from any organisation first to avoid FK violations
UPDATE users SET organisation_id = NULL WHERE email = 'admin@athleticaos.com';

-- Delete all organisations (children first if any remained, but V35 checked that)
-- We rely on CASCADE if configured, but let's be safe and just delete all since V35 cleared children tables.
DELETE FROM user_organisations; -- Clear mapping table
DELETE FROM organisations;

-- Note: On next startup, OrganisationSeedConfig will detect 0 countries and re-seed the default hierarchy.
