-- Seed admin user with password 'password123'
-- BCrypt hash for 'password123': $2a$10$IF2iAWF9TErRu3XbOc8rJel14a0VMuaqQEUEx554qb6x/ftUIO0m.

INSERT INTO users (id, email, password_hash, first_name, last_name, is_active) 
VALUES (
    gen_random_uuid(), 
    'admin@athleticaos.com', 
    '$2a$10$IF2iAWF9TErRu3XbOc8rJel14a0VMuaqQEUEx554qb6x/ftUIO0m.', 
    'Super',
    'Admin',
    TRUE
);

-- Assign SUPER_ADMIN role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@athleticaos.com' AND r.name = 'ROLE_SUPER_ADMIN';
