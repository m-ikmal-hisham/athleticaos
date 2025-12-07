INSERT INTO organisations (id, name, org_type, org_level, primary_color, secondary_color, accent_color, logo_url, cover_image_url, status, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'Branding Test Rugby Club', 
    'CLUB', -- org_type
    'CLUB', -- org_level
    '#EA580C', -- Orange primary
    '#000000', -- Black secondary
    '#FFFFFF', -- White accent
    'https://cdn.worldvectorlogo.com/logos/rugby-world-cup-1.svg', -- example logo
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=2000&auto=format&fit=crop', -- rugby field cover
    'Active',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Org Admin User "branding_admin@athleticaos.com"
INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, organisation_id, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'branding_admin@athleticaos.com',
    '$2a$10$IF2iAWF9TErRu3XbOc8rJel14a0VMuaqQEUEx554qb6x/ftUIO0m.', -- password123
    'Branding',
    'Admin',
    TRUE,
    '11111111-1111-1111-1111-111111111111',
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- 3. Assign ROLE_ORG_ADMIN to the user
INSERT INTO user_roles (user_id, role_id)
SELECT '22222222-2222-2222-2222-222222222222', id
FROM roles
WHERE name = 'ROLE_ORG_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Create a Published Tournament for this Org
INSERT INTO tournaments (id, name, level, organiser_org_id, start_date, end_date, venue, is_published, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Branding Championship 2025',
    'NATIONAL',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    'National Stadium',
    TRUE,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
