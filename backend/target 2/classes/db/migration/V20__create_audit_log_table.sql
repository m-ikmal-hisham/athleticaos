CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    actor_user_id UUID NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(255) NOT NULL,
    organisation_id UUID,
    organisation_name VARCHAR(255),
    action_type VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID NOT NULL,
    entity_summary VARCHAR(500),
    details_json TEXT,
    ip_address VARCHAR(255),
    user_agent VARCHAR(500)
);

CREATE INDEX idx_audit_timestamp ON audit_log (timestamp DESC);
CREATE INDEX idx_audit_org ON audit_log (organisation_id);
CREATE INDEX idx_audit_actor ON audit_log (actor_user_id);
CREATE INDEX idx_audit_composite ON audit_log (timestamp DESC, organisation_id, actor_user_id);
