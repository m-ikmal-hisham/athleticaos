-- ============================================================================
-- Identification Backfill Verification Script (Read-Only)
-- Purpose: Inspect HMAC hash coverage, status breakdown, and data integrity.
-- Note: This script contains ONLY SELECT statements and modifies no data.
-- Phase 2.1: Outputs aggregate counts only. No names, raw IC values,
-- full hashes, or secrets are included in default output.
-- ============================================================================

-- 1. Overview counts: total persons, hashed, unhashed, and identification presence
SELECT
    COUNT(*) AS total_persons,
    COUNT(CASE WHEN ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> '' THEN 1 END) AS with_primary_source,
    COUNT(CASE WHEN identification_value IS NOT NULL AND TRIM(identification_value) <> '' THEN 1 END) AS with_secondary_source,
    COUNT(CASE WHEN identification_hash IS NOT NULL THEN 1 END) AS with_identification_hash,
    COUNT(CASE WHEN identification_hash IS NULL
               AND (ic_or_passport IS NOT NULL OR identification_value IS NOT NULL) THEN 1 END) AS unhashed_with_source,
    COUNT(CASE WHEN identification_hash IS NULL
               AND (ic_or_passport IS NULL OR TRIM(ic_or_passport) = '')
               AND (identification_value IS NULL OR TRIM(identification_value) = '') THEN 1 END) AS without_identification
FROM persons;

-- 2. Hash version distribution
SELECT
    COALESCE(CAST(identification_hash_version AS TEXT), 'NULL') AS hash_version,
    COUNT(*) AS record_count
FROM persons
GROUP BY identification_hash_version
ORDER BY identification_hash_version ASC NULLS LAST;

-- 3. Verification status breakdown
SELECT
    identification_verification_status,
    COUNT(*) AS record_count,
    COUNT(CASE WHEN identification_hash IS NOT NULL THEN 1 END) AS count_with_hash,
    COUNT(CASE WHEN identification_hash IS NULL THEN 1 END) AS count_without_hash
FROM persons
GROUP BY identification_verification_status
ORDER BY record_count DESC;

-- 4. Duplicate hash sanity check (MUST RETURN 0 ROWS under uc_persons_identification_hash)
SELECT
    COUNT(*) AS duplicate_hash_groups
FROM (
    SELECT identification_hash
    FROM persons
    WHERE identification_hash IS NOT NULL
    GROUP BY identification_hash
    HAVING COUNT(*) > 1
) dups;

-- 5. Constraint integrity check (should return 0 for all)
SELECT
    COUNT(CASE WHEN identification_hash IS NOT NULL
               AND identification_hash !~ '^[0-9a-f]{64}$' THEN 1 END) AS malformed_hashes,
    COUNT(CASE WHEN identification_hash IS NULL
               AND identification_hash_version IS NOT NULL THEN 1 END) AS orphan_versions,
    COUNT(CASE WHEN identification_hash IS NOT NULL
               AND identification_hash_version IS NULL THEN 1 END) AS orphan_hashes,
    COUNT(CASE WHEN identification_hash_version IS NOT NULL
               AND identification_hash_version <= 0 THEN 1 END) AS non_positive_versions
FROM persons;

-- ============================================================================
-- RESTRICTED: Remediation query (UUID + reason only, no PII)
-- Uncomment only when investigating flagged records.
-- ============================================================================
-- SELECT
--     id AS person_uuid,
--     identification_verification_status AS status,
--     CASE
--         WHEN identification_hash IS NULL AND identification_hash_version IS NOT NULL THEN 'ORPHAN_VERSION'
--         WHEN identification_hash IS NOT NULL AND identification_hash_version IS NULL THEN 'ORPHAN_HASH'
--         WHEN identification_verification_status = 'FLAGGED' THEN 'FLAGGED'
--         ELSE 'UNKNOWN'
--     END AS reason_code
-- FROM persons
-- WHERE identification_verification_status = 'FLAGGED'
--    OR (identification_hash IS NULL AND identification_hash_version IS NOT NULL)
--    OR (identification_hash IS NOT NULL AND identification_hash_version IS NULL)
-- ORDER BY id ASC
-- LIMIT 100;
