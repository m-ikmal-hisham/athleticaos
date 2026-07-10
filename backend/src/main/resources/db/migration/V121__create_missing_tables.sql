CREATE TABLE IF NOT EXISTS sponsor_packages (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(19, 2) NOT NULL,
    currency VARCHAR(255) NOT NULL,
    features TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    max_teams INTEGER,
    features_enabled TEXT,
    monthly_price DECIMAL(19, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS official_registry (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    accreditation_level VARCHAR(255) NOT NULL,
    primary_role VARCHAR(255) NOT NULL,
    badge_number VARCHAR(255) NOT NULL,
    accreditation_expiry_date TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_official_registry_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS match_officials (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    official_id UUID NOT NULL,
    assigned_role VARCHAR(255) NOT NULL,
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_match_official_match FOREIGN KEY (match_id) REFERENCES matches(id),
    CONSTRAINT fk_match_official_registry FOREIGN KEY (official_id) REFERENCES official_registry(id)
);

CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL,
    url VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sanctioning_requests (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL,
    requester_org_id UUID NOT NULL,
    approver_org_id UUID NOT NULL,
    status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT fk_sanctioning_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    CONSTRAINT fk_sanctioning_requester FOREIGN KEY (requester_org_id) REFERENCES organisations(id),
    CONSTRAINT fk_sanctioning_approver FOREIGN KEY (approver_org_id) REFERENCES organisations(id)
);
