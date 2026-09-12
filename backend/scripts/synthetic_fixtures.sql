-- ============================================================================
-- Synthetic Test Fixtures for Identification HMAC Hardening Rehearsal
-- Purpose: Realistic legacy and edge-case person records for testing migration V153,
--          preflight checks, backfill runner, conflict detection, and idempotence.
-- Safety: Contains ONLY synthetic, non-real test data. Never run against production.
-- ============================================================================

-- Clean up any prior rehearsal fixtures (deterministic UUID prefix 00000000-0000-0000-0000-)
DELETE FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%';

-- 1. Standard Malaysian IC: primary source only (unhashed, unverified)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'Ahmad', 'Razak', 'MALE', '1990-05-15', 'Malaysia',
    '900515-10-5555', 'MALAYSIAN_IC', NULL,
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 2. Foreign Passport: primary source only (unhashed, unverified)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000002', 'John', 'Doe', 'MALE', '1988-11-20', 'Malaysia',
    'A12345678', 'PASSPORT', NULL,
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 3. Secondary source only (ic_or_passport is empty, identification_value is present; satisfies NOT NULL)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000003', 'Siti', 'Aminah', 'FEMALE', '1995-03-10', 'Malaysia',
    '', 'MALAYSIAN_IC', '950310-08-6666',
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 4. Matching dual sources (both present, same normalized value)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000004', 'Tan', 'Wei Ming', 'MALE', '1992-07-22', 'Malaysia',
    '920722-01-7777', 'MALAYSIAN_IC', '920722017777',
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 5. Conflicting dual sources (both present, different normalized values -> should FLAGGED)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000005', 'Muthu', 'Kumar', 'MALE', '1985-09-05', 'Malaysia',
    '850905-02-8888', 'MALAYSIAN_IC', '900101-01-1111',
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 6. Blank / whitespace identification (should skip)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000006', 'Empty', 'Identifier', 'FEMALE', '2000-01-01', 'Malaysia',
    '    ', 'MALAYSIAN_IC', NULL,
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 7. Already hashed at version 1 (idempotency check -> should remain unchanged)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000007', 'Already', 'Migrated', 'MALE', '1993-12-12', 'Malaysia',
    '931212-14-9999', 'MALAYSIAN_IC', '931212149999',
    '7b47b1e4f3a987d6e5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2', 1, 'LEGACY',
    NOW()
);

-- 8. Pre-existing flagged record (should skip or remain flagged)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000008', 'Previously', 'Flagged', 'FEMALE', '1996-04-18', 'Malaysia',
    'INVALID-IC-FORMAT', 'OTHER', NULL,
    NULL, NULL, 'FLAGGED',
    NOW()
);

-- 9. Duplicate pair member A (same IC as fixture 10 -> tests in-batch or db duplicate detection)
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000009', 'Duplicate', 'One', 'MALE', '1991-06-06', 'Malaysia',
    '910606-10-1234', 'MALAYSIAN_IC', NULL,
    NULL, NULL, 'UNVERIFIED',
    NOW()
);

-- 10. Duplicate pair member B: SAME identity as fixture 9 but written without separators.
-- The DB unique index is on the exact string, so both rows can exist; they normalise to the
-- same value, which is the real-world legacy duplicate the backfill must FLAG.
INSERT INTO persons (
    id, first_name, last_name, gender, dob, nationality,
    ic_or_passport, identification_type, identification_value,
    identification_hash, identification_hash_version, identification_verification_status,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000010', 'Duplicate', 'Two', 'MALE', '1991-06-06', 'Malaysia',
    '910606101234', 'MALAYSIAN_IC', NULL,
    NULL, NULL, 'UNVERIFIED',
    NOW()
);
