-- Migration V154: Password lifecycle columns (QA21-07 credential hardening)
-- must_change_password: the user must set a new password before any authenticated access is granted.
-- password_changed_at:  JWTs issued before this instant are rejected, so a change/reset revokes existing sessions.
-- Schema only. Affected accounts are flagged/rotated operationally from the count-only audit, not here.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
