-- V177__e_certificates.sql
-- Per-tournament certificate settings (including private signature images and team achievements)
-- and issued participant certificate records.

CREATE TABLE certificate_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    design VARCHAR(32) NOT NULL DEFAULT 'MODERN',
    title VARCHAR(160),
    language VARCHAR(16) NOT NULL DEFAULT 'EN',
    remark TEXT,
    issue_date DATE,
    signatory1_name VARCHAR(120),
    signatory1_title VARCHAR(120),
    signature1_image BYTEA,
    signature1_content_type VARCHAR(64),
    signatory2_name VARCHAR(120),
    signatory2_title VARCHAR(120),
    signature2_image BYTEA,
    signature2_content_type VARCHAR(64),
    show_verification BOOLEAN NOT NULL DEFAULT TRUE,
    team_achievements JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_certificate_settings_tournament UNIQUE (tournament_id)
);

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) NOT NULL,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    category_id UUID REFERENCES tournament_categories(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    achievement_text VARCHAR(160),
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    CONSTRAINT uq_certificates_code UNIQUE (code),
    CONSTRAINT uq_certificates_tournament_team_player UNIQUE (tournament_id, team_id, player_id)
);

CREATE INDEX idx_certificates_tournament ON certificates(tournament_id);
CREATE INDEX idx_certificates_tournament_team ON certificates(tournament_id, team_id);
