-- ============================================================================
-- Preflight Check for V153 Constraints (Read-Only)
-- Run BEFORE applying V153__harden_identification_hash_constraints.sql
-- If any query returns rows, remediation is required before migration.
-- ============================================================================

-- 1. Malformed hashes: non-null hashes that don't match ^[0-9a-f]{64}$
SELECT
    'malformed_hash' AS violation_type,
    COUNT(*) AS violation_count
FROM persons
WHERE identification_hash IS NOT NULL
  AND identification_hash !~ '^[0-9a-f]{64}$';

-- 2. Orphan versions: version present but hash is null
SELECT
    'orphan_version_no_hash' AS violation_type,
    COUNT(*) AS violation_count
FROM persons
WHERE identification_hash IS NULL
  AND identification_hash_version IS NOT NULL;

-- 3. Orphan hashes: hash present but version is null
SELECT
    'orphan_hash_no_version' AS violation_type,
    COUNT(*) AS violation_count
FROM persons
WHERE identification_hash IS NOT NULL
  AND identification_hash_version IS NULL;

-- 4. Non-positive versions
SELECT
    'non_positive_version' AS violation_type,
    COUNT(*) AS violation_count
FROM persons
WHERE identification_hash_version IS NOT NULL
  AND identification_hash_version <= 0;

-- 5. Summary: if all counts are 0, V153 can be applied safely
SELECT
    'PREFLIGHT_SUMMARY' AS check,
    CASE
        WHEN (
            (SELECT COUNT(*) FROM persons WHERE identification_hash IS NOT NULL AND identification_hash !~ '^[0-9a-f]{64}$') +
            (SELECT COUNT(*) FROM persons WHERE identification_hash IS NULL AND identification_hash_version IS NOT NULL) +
            (SELECT COUNT(*) FROM persons WHERE identification_hash IS NOT NULL AND identification_hash_version IS NULL) +
            (SELECT COUNT(*) FROM persons WHERE identification_hash_version IS NOT NULL AND identification_hash_version <= 0)
        ) = 0
        THEN 'PASS — safe to apply V153'
        ELSE 'FAIL — remediation required before V153'
    END AS result;
