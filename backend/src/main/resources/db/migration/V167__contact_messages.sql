-- Migration V167: Contact Messages
--
-- Stores public contact form submissions (organisations, partners,
-- and general enquiries) and tracks email dispatch status.

CREATE TABLE contact_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(120) NOT NULL,
    email        VARCHAR(254) NOT NULL,
    organisation VARCHAR(160),
    subject      VARCHAR(40)  NOT NULL,
    message      TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    mail_sent    BOOLEAN      NOT NULL DEFAULT false,
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_created_at ON contact_messages (created_at);
