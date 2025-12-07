-- Create token_generation table for session invalidation
CREATE TABLE IF NOT EXISTS token_generation (
    id BIGINT PRIMARY KEY DEFAULT 1,
    generation BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP,
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert initial row
INSERT INTO token_generation (id, generation, updated_at)
VALUES (1, 1, NOW())
ON CONFLICT (id) DO NOTHING;
