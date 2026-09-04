-- ============================================================================
-- Identification Backfill Verification Script (Read-Only)
-- Purpose: Inspect HMAC hash coverage, status breakdown, and data integrity.
-- Note: This script contains ONLY SELECT statements and modifies no data.
-- ============================================================================

-- 1. Overview counts: total persons, hashed, unhashed, and plaintext presence
SELECT 
    COUNT(*) AS total_persons,
    COUNT(CASE WHEN ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> '' THEN 1 END) AS with_plaintext_ic,
    COUNT(CASE WHEN identification_hash IS NOT NULL THEN 1 END) AS with_identification_hash,
    COUNT(CASE WHEN identification_hash IS NULL AND ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> '' THEN 1 END) AS unhashed_with_plaintext,
    COUNT(CASE WHEN identification_hash IS NULL AND (ic_or_passport IS NULL OR TRIM(ic_or_passport) = '') THEN 1 END) AS without_identification
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
    identification_hash,
    COUNT(*) AS duplicate_count
FROM persons
WHERE identification_hash IS NOT NULL
GROUP BY identification_hash
HAVING COUNT(*) > 1;

-- 5. Flagged persons audit (colliding or suspicious records during backfill)
SELECT 
    id,
    first_name,
    last_name,
    identification_type,
    identification_verification_status,
    created_at
FROM persons
WHERE identification_verification_status = 'FLAGGED'
ORDER BY id ASC
LIMIT 50;

-- 6. Unprocessed records audit (records with IC that still need hashing)
SELECT 
    id,
    first_name,
    last_name,
    identification_type,
    identification_verification_status,
    created_at
FROM persons
WHERE identification_hash IS NULL
  AND ic_or_passport IS NOT NULL
  AND TRIM(ic_or_passport) <> ''
ORDER BY id ASC
LIMIT 50;
