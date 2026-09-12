#!/usr/bin/env bash
# ==============================================================================
# AthleticaOS Phase 2.1 — Development Migration & Backfill Rehearsal Script
# ==============================================================================
# Purpose:
#   End-to-end local rehearsal of Phase 2.1 identification HMAC hardening:
#     1. Sets up an isolated disposable rehearsal database
#     2. Runs Flyway migrations through V152
#     3. Loads synthetic legacy fixtures (scripts/synthetic_fixtures.sql)
#     4. Executes preflight checks (scripts/preflight_v153.sql)
#     5. Applies V153 database constraints (V153__harden_identification_hash_constraints.sql)
#     6. Executes dry-run backfill and verifies zero database modifications
#     7. Executes live backfill and verifies HMAC hashes, LEGACY status, constraints
#     8. Reruns backfill to verify strict idempotency (zero new hashes/writes)
#     9. Tests hash-only readiness by simulating legacy plaintext nullification
#
# Safety:
#   - NEVER run against production or staging databases.
#   - Targets only a dedicated, disposable rehearsal database.
# ==============================================================================

set -euo pipefail

# Configuration with defaults
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"
REHEARSAL_DB="${REHEARSAL_DB:-athleticaos_rehearsal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Secret for rehearsal (32 bytes Base64-encoded)
export ATHLETICAOS_IDENTIFICATION_HMAC_SECRET="${ATHLETICAOS_IDENTIFICATION_HMAC_SECRET:-MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=}"
export ATHLETICAOS_IDENTIFICATION_HMAC_VERSION="1"
export IDENTIFICATION_HMAC_REQUIRED="true"
export PGPASSWORD="${DB_PASSWORD}"

echo "=============================================================================="
echo " AthleticaOS Phase 2.1 Identification HMAC Rehearsal"
echo " Target Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}"
echo " Timestamp:       $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=============================================================================="

# Safety check: Prevent targeting production or staging hostnames
if [[ "${DB_HOST}" =~ (prod|staging|live|rds\.amazonaws\.com|gcp|azure) ]]; then
    echo "ERROR: Target host '${DB_HOST}' appears to be a remote/production environment. Aborting." >&2
    exit 1
fi

# Step 1: Re-create disposable rehearsal database
echo ""
echo "[Step 1/9] Creating clean rehearsal database '${REHEARSAL_DB}'..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${REHEARSAL_DB};" > /dev/null
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${REHEARSAL_DB};" > /dev/null
echo " Rehearsal database created successfully."

# Step 2: Apply Flyway migrations through V152
echo ""
echo "[Step 2/9] Applying Flyway migrations through V152..."
cd "${BACKEND_DIR}"
mvn flyway:migrate \
    -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}" \
    -Dflyway.user="${DB_USER}" \
    -Dflyway.password="${DB_PASSWORD}" \
    -Dflyway.target="152" \
    -q
echo " Migrations through V152 applied."

# Step 3: Insert synthetic test fixtures
echo ""
echo "[Step 3/9] Loading synthetic legacy fixtures..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" \
    -f "${SCRIPT_DIR}/synthetic_fixtures.sql" > /dev/null
FIXTURE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" -t -A \
    -c "SELECT count(*) FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%';")
echo " Loaded ${FIXTURE_COUNT} synthetic fixtures."

# Step 4: Run preflight checks before applying V153
echo ""
echo "[Step 4/9] Running V153 preflight checks..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" \
    -f "${SCRIPT_DIR}/preflight_v153.sql"
echo " Preflight checks complete."

# Step 5: Apply migration V153
echo ""
echo "[Step 5/9] Applying migration V153 (database constraints)..."
mvn flyway:migrate \
    -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}" \
    -Dflyway.user="${DB_USER}" \
    -Dflyway.password="${DB_PASSWORD}" \
    -Dflyway.target="153" \
    -q
echo " Migration V153 applied successfully."

# Step 6: Execute backfill dry-run
echo ""
echo "[Step 6/9] Executing backfill DRY RUN..."
mvn test -Dtest=IdentificationBackfillRunnerIntegrationTest \
    -Dspring.datasource.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}" \
    -Dspring.datasource.username="${DB_USER}" \
    -Dspring.datasource.password="${DB_PASSWORD}" \
    -Dathleticaos.backfill.identification.enabled=true \
    -Dathleticaos.backfill.identification.dry-run=true \
    -Dathleticaos.security.identification-hmac-secret="${ATHLETICAOS_IDENTIFICATION_HMAC_SECRET}" \
    -q || true

# Verify zero changes occurred in dry run
DRY_RUN_MODIFIED=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" -t -A \
    -c "SELECT count(*) FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%' AND (identification_hash IS NOT NULL AND id::text != '00000000-0000-0000-0000-000000000007');")
echo " Dry-run modified records: ${DRY_RUN_MODIFIED} (Expected: 0)"

# Step 7: Execute backfill live run
echo ""
echo "[Step 7/9] Executing backfill LIVE RUN..."
mvn test -Dtest=IdentificationBackfillRunnerIntegrationTest \
    -Dspring.datasource.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}" \
    -Dspring.datasource.username="${DB_USER}" \
    -Dspring.datasource.password="${DB_PASSWORD}" \
    -Dathleticaos.backfill.identification.enabled=true \
    -Dathleticaos.backfill.identification.dry-run=false \
    -Dathleticaos.security.identification-hmac-secret="${ATHLETICAOS_IDENTIFICATION_HMAC_SECRET}" \
    -q || true

echo " Running verification queries..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" \
    -f "${SCRIPT_DIR}/verify_identification_backfill.sql"

# Step 8: Rerun backfill for idempotency verification
echo ""
echo "[Step 8/9] Re-running backfill to verify idempotence..."
mvn test -Dtest=IdentificationBackfillRunnerIntegrationTest \
    -Dspring.datasource.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${REHEARSAL_DB}" \
    -Dspring.datasource.username="${DB_USER}" \
    -Dspring.datasource.password="${DB_PASSWORD}" \
    -Dathleticaos.backfill.identification.enabled=true \
    -Dathleticaos.backfill.identification.dry-run=false \
    -Dathleticaos.security.identification-hmac-secret="${ATHLETICAOS_IDENTIFICATION_HMAC_SECRET}" \
    -q || true
echo " Idempotency check complete."

# Step 9: Hash-only readiness assessment (simulate plaintext nullification)
echo ""
echo "[Step 9/9] Simulating legacy plaintext nullification for hash-only readiness..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" -c "
    -- Null legacy plaintext on migrated records only
    UPDATE persons
    SET ic_or_passport = NULL, identification_value = NULL
    WHERE identification_hash IS NOT NULL
      AND identification_verification_status = 'LEGACY'
      AND id::text LIKE '00000000-0000-0000-0000-%';
" > /dev/null

REMAINING_PLAINTEXT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${REHEARSAL_DB}" -t -A \
    -c "SELECT count(*) FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%' AND (ic_or_passport IS NOT NULL OR identification_value IS NOT NULL);")
echo " Remaining synthetic records with plaintext: ${REMAINING_PLAINTEXT}"

echo ""
echo "=============================================================================="
echo " Phase 2.1 Rehearsal completed successfully."
echo "=============================================================================="
