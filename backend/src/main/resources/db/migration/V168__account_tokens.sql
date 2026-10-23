-- Migration V168: Account Tokens & Invite Acceptance
--
-- Adds account_tokens table for secure, hashed, single-use invite and password reset tokens.
-- Adds invite_accepted_at to users and backfills existing users as accepted.

CREATE TABLE account_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(20) NOT NULL CHECK (purpose IN ('INVITE', 'RESET')),
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    created_by  UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    request_ip  VARCHAR(64) NULL
);

CREATE INDEX idx_account_tokens_user_purpose ON account_tokens (user_id, purpose);

ALTER TABLE users ADD COLUMN invite_accepted_at TIMESTAMP NULL;

-- Backfill all existing users as already accepted
UPDATE users SET invite_accepted_at = created_at WHERE invite_accepted_at IS NULL;
