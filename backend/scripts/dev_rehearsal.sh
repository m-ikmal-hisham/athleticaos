#!/usr/bin/env bash
# ==============================================================================
# AthleticaOS Phase 2.1 — Development Migration & Backfill Rehearsal Script
# ==============================================================================
# Purpose:
#   End-to-end local rehearsal of Phase 2.1 identification HMAC hardening:
#     1. Sets up an isolated disposable rehearsal database
#     2. Runs Flyway migrations through V152 (via Spring Boot jar)
#     3. Loads synthetic legacy fixtures (scripts/synthetic_fixtures.sql)
#     4. Executes preflight checks (scripts/preflight_v153.sql)
#     5. Applies V153 database constraints (via Spring Boot jar)
#     6. Executes dry-run backfill and asserts zero database modifications
#     7. Executes live backfill and asserts HMAC hashes, LEGACY status, constraints
#     8. Reruns backfill to assert strict idempotency (zero new hashes/writes)
#     9. Tests hash-only readiness by simulating legacy plaintext nullification
#
# Safety:
#   - Defaults to an isolated throwaway Docker PostgreSQL container on port 55432.
#   - External targets require strict naming, localhost binding, non-dev database,
#     explicit --yes-drop <dbname> opt-in, and verification of zero real data.
#   - Never outputs secrets, passwords, plaintext identifiers or full hashes.
# ==============================================================================

set -euo pipefail

# Script directory resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Target configuration defaults
USE_CONTAINER=true
EXTERNAL_TARGET=false
YES_DROP_NAME=""
TARGET_DB="athleticaos_rehearsal"
DB_HOST="127.0.0.1"
DB_PORT=""
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"

# Parse command line options
while [[ $# -gt 0 ]]; do
    case "$1" in
        --external-target)
            USE_CONTAINER=false
            EXTERNAL_TARGET=true
            shift
            ;;
        --yes-drop)
            if [[ $# -lt 2 ]]; then
                echo "ERROR: --yes-drop requires a database name argument." >&2
                exit 1
            fi
            YES_DROP_NAME="$2"
            shift 2
            ;;
        --rehearsal-db)
            if [[ $# -lt 2 ]]; then
                echo "ERROR: --rehearsal-db requires a database name argument." >&2
                exit 1
            fi
            TARGET_DB="$2"
            shift 2
            ;;
        --db-host)
            if [[ $# -lt 2 ]]; then
                echo "ERROR: --db-host requires a host argument." >&2
                exit 1
            fi
            DB_HOST="$2"
            shift 2
            ;;
        --db-port)
            if [[ $# -lt 2 ]]; then
                echo "ERROR: --db-port requires a port argument." >&2
                exit 1
            fi
            DB_PORT="$2"
            shift 2
            ;;
        --db-user)
            if [[ $# -lt 2 ]]; then
                echo "ERROR: --db-user requires a user argument." >&2
                exit 1
            fi
            DB_USER="$2"
            shift 2
            ;;
        --help|-h)
            cat << 'EOF'
AthleticaOS Phase 2.1 Rehearsal Runner

Usage:
  ./dev_rehearsal.sh [options]

Modes:
  Default: Starts an isolated, throwaway postgres:15-alpine container on port 55432
           and automatically tears it down when finished.

  External Target: Uses an existing local PostgreSQL instance.
           Requires --external-target and --yes-drop <dbname>.

Options:
  --external-target        Target an existing local PostgreSQL server instead of Docker.
  --yes-drop <dbname>      Explicit confirmation to drop and recreate the rehearsal database.
                           Required when --external-target is used; must match --rehearsal-db.
  --rehearsal-db <name>    Database name (default: athleticaos_rehearsal).
                           Must match regex ^athleticaos_rehearsal(_[a-z0-9]+)*$
  --db-host <host>         Host for external target (must be 127.0.0.1 or localhost, default: 127.0.0.1).
  --db-port <port>         Port (default: 55432 for Docker, 5432 for external).
  --db-user <user>         PostgreSQL user (default: postgres).
  -h, --help               Show this help message.

Required Environment:
  ATHLETICAOS_IDENTIFICATION_HMAC_SECRET: 32-byte Base64-encoded HMAC key (must be exported beforehand).
EOF
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$1'. Use --help for usage." >&2
            exit 1
            ;;
    esac
done

# Default port assignment based on mode
if [[ -z "${DB_PORT}" ]]; then
    if [[ "${USE_CONTAINER}" == "true" ]]; then
        DB_PORT="55432"
    else
        DB_PORT="5432"
    fi
fi

# ==============================================================================
# SAFETY CHECKS (D1)
# ==============================================================================

# 1. Require secret in environment — no hard-coded fallback, never echo it
if [[ -z "${ATHLETICAOS_IDENTIFICATION_HMAC_SECRET:-}" ]]; then
    echo "ERROR: ATHLETICAOS_IDENTIFICATION_HMAC_SECRET environment variable is not set." >&2
    echo "Set a 32-byte Base64-encoded secret before running rehearsal:" >&2
    echo "  export ATHLETICAOS_IDENTIFICATION_HMAC_SECRET=\"\$(openssl rand -base64 32)\"" >&2
    exit 1
fi

# 2. Database name regex validation
if [[ ! "${TARGET_DB}" =~ ^athleticaos_rehearsal(_[a-z0-9]+)*$ ]]; then
    echo "SAFETY ERROR: Database name '${TARGET_DB}' does not match allowed pattern '^athleticaos_rehearsal(_[a-z0-9]+)*$'." >&2
    exit 1
fi

# 3. Reject primary developer database
if [[ "${TARGET_DB}" == "athleticaos" ]]; then
    echo "SAFETY ERROR: Rehearsal target cannot be the developer database 'athleticaos'." >&2
    exit 1
fi

# 4. Host must be strictly localhost or 127.0.0.1
if [[ "${DB_HOST}" != "localhost" && "${DB_HOST}" != "127.0.0.1" ]]; then
    echo "SAFETY ERROR: Database host must be exactly 'localhost' or '127.0.0.1'. Got: '${DB_HOST}'." >&2
    exit 1
fi

# 5. External target opt-in requirement
if [[ "${EXTERNAL_TARGET}" == "true" ]]; then
    if [[ "${YES_DROP_NAME}" != "${TARGET_DB}" ]]; then
        echo "SAFETY ERROR: Targeting external database requires explicit confirmation." >&2
        echo "Pass '--yes-drop ${TARGET_DB}' to confirm dropping this database." >&2
        exit 1
    fi
fi

# Export safe credentials for psql and Spring Boot
export PGPASSWORD="${DB_PASSWORD}"
export SPRING_DATASOURCE_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${TARGET_DB}"
export SPRING_DATASOURCE_USERNAME="${DB_USER}"
export SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"

echo "=============================================================================="
echo " AthleticaOS Phase 2.1 Identification HMAC Rehearsal"
echo " Mode:            $([[ "${USE_CONTAINER}" == "true" ]] && echo "Disposable Docker Container" || echo "External Local Database")"
echo " Target Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${TARGET_DB}"
echo " Timestamp:       $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=============================================================================="

# ==============================================================================
# CONTAINER LIFECYCLE MANAGEMENT
# ==============================================================================
CONTAINER_NAME="athleticaos-rehearsal-pg-$$"

cleanup() {
    local exit_code=$?
    if [[ "${USE_CONTAINER}" == "true" ]]; then
        echo ""
        echo "Tearing down throwaway container '${CONTAINER_NAME}'..."
        docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
    fi
    exit ${exit_code}
}
trap cleanup EXIT INT TERM

if [[ "${USE_CONTAINER}" == "true" ]]; then
    if ! command -v docker >/dev/null 2>&1; then
        echo "ERROR: 'docker' command not found. Install Docker or run with '--external-target --yes-drop ${TARGET_DB}'." >&2
        exit 1
    fi
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker daemon is not running. Start Docker or run with '--external-target --yes-drop ${TARGET_DB}'." >&2
        exit 1
    fi

    echo ""
    echo "Starting throwaway PostgreSQL container '${CONTAINER_NAME}' on port ${DB_PORT}..."
    docker run -d --name "${CONTAINER_NAME}" \
        -e POSTGRES_USER="${DB_USER}" \
        -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
        -e POSTGRES_DB="postgres" \
        -p "${DB_PORT}:5432" \
        postgres:15-alpine > /dev/null

    echo "Waiting for PostgreSQL container to accept connections..."
    TRIES=0
    until psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "SELECT 1;" >/dev/null 2>&1; do
        sleep 1
        TRIES=$((TRIES + 1))
        if [[ ${TRIES} -ge 30 ]]; then
            echo "ERROR: Timed out waiting for PostgreSQL container to start." >&2
            exit 1
        fi
    done
    echo "PostgreSQL container is ready."
fi

# ==============================================================================
# PRE-DROP DATA INTEGRITY CHECK (EXTERNAL TARGET)
# ==============================================================================
if [[ "${EXTERNAL_TARGET}" == "true" ]]; then
    # Check if database already exists
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -lqt | cut -d \| -f 1 | grep -qw "${TARGET_DB}"; then
        TABLE_EXISTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
            -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persons');" 2>/dev/null || echo "false")
        if [[ "${TABLE_EXISTS}" == "t" || "${TABLE_EXISTS}" == "true" ]]; then
            NON_FIXTURE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
                -c "SELECT count(*) FROM persons WHERE id::text NOT LIKE '00000000-0000-0000-0000-%';" 2>/dev/null || echo "0")
            if [[ "${NON_FIXTURE_COUNT}" -gt 0 ]]; then
                echo "SAFETY ERROR: Database '${TARGET_DB}' contains ${NON_FIXTURE_COUNT} non-fixture records in 'persons'." >&2
                echo "Aborting to prevent dropping real or application data." >&2
                exit 1
            fi
        fi
    fi
fi

# ==============================================================================
# JDK RESOLUTION & VALIDATION (PIN JAVA 21 FOR BUILD/TEST)
# ==============================================================================
detect_java_version() {
    local j_bin="$1"
    if [[ -n "${j_bin}" && -x "${j_bin}" ]]; then
        "${j_bin}" -version 2>&1 | sed -nE 's/.*version "([^"]+)".*/\1/p'
    else
        echo ""
    fi
}

RESOLVED_JAVA_HOME=""
if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    JH_VER=$(detect_java_version "${JAVA_HOME}/bin/java")
    if [[ "${JH_VER}" =~ ^21(\.|$) ]]; then
        RESOLVED_JAVA_HOME="${JAVA_HOME}"
        echo "Using Java 21 from JAVA_HOME: ${RESOLVED_JAVA_HOME} (version ${JH_VER})"
    fi
fi

if [[ -z "${RESOLVED_JAVA_HOME}" ]]; then
    for candidate in \
        "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
        "/usr/lib/jvm/java-21-openjdk" \
        "/usr/lib/jvm/java-21"; do
        if [[ -d "${candidate}" && -x "${candidate}/bin/java" ]]; then
            C_VER=$(detect_java_version "${candidate}/bin/java")
            if [[ "${C_VER}" =~ ^21(\.|$) ]]; then
                RESOLVED_JAVA_HOME="${candidate}"
                echo "Detected Java 21 installation at: ${RESOLVED_JAVA_HOME} (version ${C_VER})"
                break
            fi
        fi
    done
fi

if [[ -n "${RESOLVED_JAVA_HOME}" ]]; then
    export JAVA_HOME="${RESOLVED_JAVA_HOME}"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    JAVA_CMD="${JAVA_HOME}/bin/java"
else
    SYSTEM_JAVA_PATH=$(command -v java || echo "")
    SYSTEM_JAVA_VER=$(detect_java_version "${SYSTEM_JAVA_PATH}")
    echo "NOTICE: JAVA_HOME is not set to a Java 21 installation."
    echo "Using JDK from PATH: ${SYSTEM_JAVA_PATH:-none} (version ${SYSTEM_JAVA_VER:-unknown})"
    if [[ ! "${SYSTEM_JAVA_VER}" =~ ^21(\.|$) ]]; then
        echo "WARNING: AthleticaOS Maven build and test suite require Java 21."
        echo "If the Maven build fails, set JAVA_HOME to a Java 21 installation."
    fi
    JAVA_CMD="java"
fi

# ==============================================================================
# BUILD BACKEND JAR (REBUILD IF MISSING OR STALE)
# ==============================================================================
JAR_FILE="${BACKEND_DIR}/target/backend-0.0.1-SNAPSHOT.jar"
REBUILD=false
REBUILD_REASON=""

if [[ ! -f "${JAR_FILE}" ]]; then
    REBUILD=true
    REBUILD_REASON="Backend jar not found at '${JAR_FILE}'"
else
    NEWER_COUNT=$(find "${BACKEND_DIR}/src/main" -newer "${JAR_FILE}" 2>/dev/null | wc -l | tr -d ' ')
    if [[ "${NEWER_COUNT}" -gt 0 ]]; then
        REBUILD=true
        REBUILD_REASON="Found ${NEWER_COUNT} source file(s) under src/main newer than backend jar"
    fi
fi

if [[ "${REBUILD}" == "true" ]]; then
    echo ""
    echo "${REBUILD_REASON}. Building with ./mvnw -DskipTests package..."
    BUILD_LOG=$(mktemp)
    if ! (cd "${BACKEND_DIR}" && ./mvnw -DskipTests package > "${BUILD_LOG}" 2>&1); then
        echo "ERROR: Failed to build backend jar using JDK $(detect_java_version "${JAVA_CMD}") at '${JAVA_CMD}'." >&2
        echo "AthleticaOS requires Java 21 for Maven builds and tests." >&2
        echo "Last 30 lines of build log:" >&2
        tail -n 30 "${BUILD_LOG}" >&2
        rm -f "${BUILD_LOG}"
        exit 1
    fi
    rm -f "${BUILD_LOG}"
    if [[ ! -f "${JAR_FILE}" ]]; then
        echo "ERROR: Maven build finished but jar not found at '${JAR_FILE}'." >&2
        exit 1
    fi
    echo "Backend jar build complete."
else
    echo ""
    echo "Backend jar is up to date (${JAR_FILE}). Skipping rebuild."
fi

# Helper function to execute backend jar, capturing output to a log file.
# On failure, prints the last 30 lines of output before exiting.
# Keeps successful runs quiet.
run_backend_jar() {
    local log_file="$1"
    shift
    if ! "${JAVA_CMD}" -jar "${JAR_FILE}" "$@" > "${log_file}" 2>&1; then
        local exit_code=$?
        echo "ERROR: Backend execution failed (exit code ${exit_code})." >&2
        echo "Last 30 lines of log:" >&2
        tail -n 30 "${log_file}" >&2
        return ${exit_code}
    fi
    return 0
}

# Helper function to compute checksum over sensitive columns
compute_checksum() {
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
        SELECT md5(COALESCE(string_agg(
            id::text || '|' ||
            COALESCE(identification_hash, '') || '|' ||
            COALESCE(identification_hash_version::text, '') || '|' ||
            COALESCE(identification_verification_status, '') || '|' ||
            COALESCE(ic_or_passport, '') || '|' ||
            COALESCE(identification_value, ''),
            ',' ORDER BY id
        ), 'empty')) FROM persons;"
}

# Step 1: Re-create disposable rehearsal database
echo ""
echo "[Step 1/9] Creating clean rehearsal database '${TARGET_DB}'..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" > /dev/null
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE \"${TARGET_DB}\";" > /dev/null
echo "Rehearsal database created successfully."

# Step 2: Apply Flyway migrations through V152 using the packaged backend jar
echo ""
echo "[Step 2/9] Applying Flyway migrations through V152 via backend jar..."
STEP2_LOG=$(mktemp)
if ! run_backend_jar "${STEP2_LOG}" \
    --spring.main.web-application-type=none \
    --spring.jpa.hibernate.ddl-auto=none \
    --spring.flyway.enabled=true \
    --spring.flyway.target=152 \
    --athleticaos.backfill.identification.enabled=false; then
    rm -f "${STEP2_LOG}"
    exit 1
fi
rm -f "${STEP2_LOG}"

# Assert V152 migration is recorded as successful
V152_SUCCESS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
    -c "SELECT success FROM flyway_schema_history WHERE version = '152';")
if [[ "${V152_SUCCESS}" != "t" && "${V152_SUCCESS}" != "true" ]]; then
    echo "ASSERTION FAILED: Flyway migration through V152 was not recorded as successful." >&2
    exit 1
fi
echo "Migrations through V152 applied successfully."

# Step 3: Insert synthetic test fixtures
echo ""
echo "[Step 3/9] Loading synthetic legacy fixtures..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" \
    -f "${SCRIPT_DIR}/synthetic_fixtures.sql" > /dev/null

FIXTURE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
    -c "SELECT count(*) FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%';")
if [[ "${FIXTURE_COUNT}" -ne 10 ]]; then
    echo "ASSERTION FAILED: Expected exactly 10 synthetic fixtures, loaded ${FIXTURE_COUNT}." >&2
    exit 1
fi
echo "Loaded ${FIXTURE_COUNT} synthetic fixtures successfully."

# Step 4: Run preflight checks before applying V153
echo ""
echo "[Step 4/9] Running V153 preflight checks..."
PREFLIGHT_OUTPUT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" \
    -f "${SCRIPT_DIR}/preflight_v153.sql")
echo "${PREFLIGHT_OUTPUT}"

PREFLIGHT_STATUS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
    -c "SELECT CASE WHEN (
        (SELECT COUNT(*) FROM persons WHERE identification_hash IS NOT NULL AND identification_hash !~ '^[0-9a-f]{64}$') +
        (SELECT COUNT(*) FROM persons WHERE identification_hash IS NULL AND identification_hash_version IS NOT NULL) +
        (SELECT COUNT(*) FROM persons WHERE identification_hash IS NOT NULL AND identification_hash_version IS NULL) +
        (SELECT COUNT(*) FROM persons WHERE identification_hash_version IS NOT NULL AND identification_hash_version <= 0)
    ) = 0 THEN 'PASS' ELSE 'FAIL' END;")

if [[ "${PREFLIGHT_STATUS}" != "PASS" ]]; then
    echo "ASSERTION FAILED: Preflight checks for V153 reported FAIL." >&2
    exit 1
fi
echo "Preflight checks passed."

# Step 5: Apply migration V153 (database constraints)
echo ""
echo "[Step 5/9] Applying migration V153 (database constraints)..."
STEP5_LOG=$(mktemp)
if ! run_backend_jar "${STEP5_LOG}" \
    --spring.main.web-application-type=none \
    --spring.jpa.hibernate.ddl-auto=none \
    --spring.flyway.enabled=true \
    --spring.flyway.target=153 \
    --athleticaos.backfill.identification.enabled=false; then
    rm -f "${STEP5_LOG}"
    exit 1
fi
rm -f "${STEP5_LOG}"

V153_SUCCESS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
    -c "SELECT success FROM flyway_schema_history WHERE version = '153';")
if [[ "${V153_SUCCESS}" != "t" && "${V153_SUCCESS}" != "true" ]]; then
    echo "ASSERTION FAILED: Flyway migration V153 was not recorded as successful." >&2
    exit 1
fi
echo "Migration V153 applied successfully."

# Step 6: Execute backfill dry-run
echo ""
echo "[Step 6/9] Executing backfill DRY RUN..."
CHECKSUM_BEFORE_DRY=$(compute_checksum)

DRY_RUN_LOG=$(mktemp)
if ! run_backend_jar "${DRY_RUN_LOG}" \
    --spring.main.web-application-type=none \
    --spring.jpa.hibernate.ddl-auto=none \
    --spring.flyway.enabled=false \
    --athleticaos.backfill.identification.enabled=true \
    --athleticaos.backfill.identification.dry-run=true \
    --athleticaos.backfill.identification.batch-size=100; then
    rm -f "${DRY_RUN_LOG}"
    exit 1
fi

CHECKSUM_AFTER_DRY=$(compute_checksum)

# Assert strict zero writes in dry run
if [[ "${CHECKSUM_BEFORE_DRY}" != "${CHECKSUM_AFTER_DRY}" ]]; then
    echo "ASSERTION FAILED: Dry-run modified database records! (Pre/Post checksum mismatch)" >&2
    rm -f "${DRY_RUN_LOG}"
    exit 1
fi

# Extract metrics from dry-run summary log
DRY_SUMMARY_LINE=$(grep "Identification backfill completed. Summary:" "${DRY_RUN_LOG}" | tail -n 1 || true)
if [[ -z "${DRY_SUMMARY_LINE}" ]]; then
    echo "ASSERTION FAILED: Could not locate backfill summary in dry-run output." >&2
    rm -f "${DRY_RUN_LOG}"
    exit 1
fi

DRY_PROCESSED=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*processed=\([0-9]*\).*/\1/p')
DRY_HASHED=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*hashed=\([0-9]*\).*/\1/p')
DRY_FLAGGED=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*flagged=\([0-9]*\).*/\1/p')
DRY_CONFLICTING=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*conflicting=\([0-9]*\).*/\1/p')
DRY_SKIPPED=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*skipped=\([0-9]*\).*/\1/p')
DRY_ALREADY_HASHED=$(echo "${DRY_SUMMARY_LINE}" | sed -n 's/.*alreadyHashed=\([0-9]*\).*/\1/p')
rm -f "${DRY_RUN_LOG}"

echo "Dry-run verified: 0 database modifications (checksum match)."
echo "Dry-run classifications: processed=${DRY_PROCESSED}, hashed=${DRY_HASHED}, flagged=${DRY_FLAGGED}, conflicting=${DRY_CONFLICTING}, skipped=${DRY_SKIPPED}, alreadyHashed=${DRY_ALREADY_HASHED}."

# Step 7: Execute backfill live run
echo ""
echo "[Step 7/9] Executing backfill LIVE RUN..."
LIVE_RUN_LOG=$(mktemp)
if ! run_backend_jar "${LIVE_RUN_LOG}" \
    --spring.main.web-application-type=none \
    --spring.jpa.hibernate.ddl-auto=none \
    --spring.flyway.enabled=false \
    --athleticaos.backfill.identification.enabled=true \
    --athleticaos.backfill.identification.dry-run=false \
    --athleticaos.backfill.identification.batch-size=100; then
    rm -f "${LIVE_RUN_LOG}"
    exit 1
fi

LIVE_SUMMARY_LINE=$(grep "Identification backfill completed. Summary:" "${LIVE_RUN_LOG}" | tail -n 1 || true)
if [[ -z "${LIVE_SUMMARY_LINE}" ]]; then
    echo "ASSERTION FAILED: Could not locate backfill summary in live-run output." >&2
    rm -f "${LIVE_RUN_LOG}"
    exit 1
fi

LIVE_PROCESSED=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*processed=\([0-9]*\).*/\1/p')
LIVE_HASHED=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*hashed=\([0-9]*\).*/\1/p')
LIVE_FLAGGED=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*flagged=\([0-9]*\).*/\1/p')
LIVE_CONFLICTING=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*conflicting=\([0-9]*\).*/\1/p')
LIVE_SKIPPED=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*skipped=\([0-9]*\).*/\1/p')
LIVE_ALREADY_HASHED=$(echo "${LIVE_SUMMARY_LINE}" | sed -n 's/.*alreadyHashed=\([0-9]*\).*/\1/p')
rm -f "${LIVE_RUN_LOG}"

# Assert dry-run and live-run classifications match exactly
if [[ "${DRY_PROCESSED}" != "${LIVE_PROCESSED}" || \
      "${DRY_HASHED}" != "${LIVE_HASHED}" || \
      "${DRY_FLAGGED}" != "${LIVE_FLAGGED}" || \
      "${DRY_CONFLICTING}" != "${LIVE_CONFLICTING}" || \
      "${DRY_SKIPPED}" != "${LIVE_SKIPPED}" || \
      "${DRY_ALREADY_HASHED}" != "${LIVE_ALREADY_HASHED}" ]]; then
    echo "ASSERTION FAILED: Live-run classifications do not match dry-run classifications!" >&2
    echo "Dry-run: processed=${DRY_PROCESSED}, hashed=${DRY_HASHED}, flagged=${DRY_FLAGGED}, conflicting=${DRY_CONFLICTING}, skipped=${DRY_SKIPPED}, alreadyHashed=${DRY_ALREADY_HASHED}" >&2
    echo "Live-run: processed=${LIVE_PROCESSED}, hashed=${LIVE_HASHED}, flagged=${LIVE_FLAGGED}, conflicting=${LIVE_CONFLICTING}, skipped=${LIVE_SKIPPED}, alreadyHashed=${LIVE_ALREADY_HASHED}" >&2
    exit 1
fi
echo "Live-run classifications match dry-run exactly."

echo ""
echo "Running verification queries..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" \
    -f "${SCRIPT_DIR}/verify_identification_backfill.sql"

# Assert all eligible records hashed
UNHASHED_ELIGIBLE=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT count(*) FROM persons
    WHERE identification_hash IS NULL
      AND identification_verification_status != 'FLAGGED'
      AND (
          (ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> '')
          OR (identification_value IS NOT NULL AND TRIM(identification_value) <> '')
      );")
if [[ "${UNHASHED_ELIGIBLE}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Expected 0 unhashed eligible records, found: ${UNHASHED_ELIGIBLE}" >&2
    exit 1
fi

# Assert all hashed records have identification_hash_version = 1
INVALID_VERSIONS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT count(*) FROM persons
    WHERE identification_hash IS NOT NULL AND (identification_hash_version IS NULL OR identification_hash_version != 1);")
if [[ "${INVALID_VERSIONS}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Found ${INVALID_VERSIONS} records with invalid hash versions." >&2
    exit 1
fi

# Assert backfilled rows have status LEGACY
NEWLY_HASHED_NON_LEGACY=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT count(*) FROM persons
    WHERE identification_hash IS NOT NULL
      AND id::text LIKE '00000000-0000-0000-0000-%'
      AND id::text != '00000000-0000-0000-0000-000000000007'
      AND identification_verification_status != 'LEGACY';")
if [[ "${NEWLY_HASHED_NON_LEGACY}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Found newly hashed records without 'LEGACY' status." >&2
    exit 1
fi

# Assert zero duplicate hashes
DUPLICATES=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT count(*) FROM (
        SELECT identification_hash FROM persons
        WHERE identification_hash IS NOT NULL
        GROUP BY identification_hash HAVING count(*) > 1
    ) d;")
if [[ "${DUPLICATES}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Found duplicate hashes (${DUPLICATES} groups)." >&2
    exit 1
fi

# Assert constraint integrity
CONSTRAINT_VIOLATIONS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT (
        COUNT(CASE WHEN identification_hash IS NOT NULL AND identification_hash !~ '^[0-9a-f]{64}$' THEN 1 END) +
        COUNT(CASE WHEN identification_hash IS NULL AND identification_hash_version IS NOT NULL THEN 1 END) +
        COUNT(CASE WHEN identification_hash IS NOT NULL AND identification_hash_version IS NULL THEN 1 END) +
        COUNT(CASE WHEN identification_hash_version IS NOT NULL AND identification_hash_version <= 0 THEN 1 END)
    ) FROM persons;")
if [[ "${CONSTRAINT_VIOLATIONS}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Found ${CONSTRAINT_VIOLATIONS} constraint integrity violations." >&2
    exit 1
fi
echo "Live-run database assertions passed."

# Step 8: Rerun backfill for idempotency verification
echo ""
echo "[Step 8/9] Re-running backfill to verify idempotence..."
CHECKSUM_BEFORE_RERUN=$(compute_checksum)

RERUN_LOG=$(mktemp)
if ! run_backend_jar "${RERUN_LOG}" \
    --spring.main.web-application-type=none \
    --spring.jpa.hibernate.ddl-auto=none \
    --spring.flyway.enabled=false \
    --athleticaos.backfill.identification.enabled=true \
    --athleticaos.backfill.identification.dry-run=false \
    --athleticaos.backfill.identification.batch-size=100; then
    rm -f "${RERUN_LOG}"
    exit 1
fi

RERUN_SUMMARY_LINE=$(grep "Identification backfill completed. Summary:" "${RERUN_LOG}" | tail -n 1 || true)
if [[ -z "${RERUN_SUMMARY_LINE}" ]]; then
    echo "ASSERTION FAILED: Could not locate backfill summary in idempotence rerun output." >&2
    rm -f "${RERUN_LOG}"
    exit 1
fi

RERUN_HASHED=$(echo "${RERUN_SUMMARY_LINE}" | sed -n 's/.*hashed=\([0-9]*\).*/\1/p')
rm -f "${RERUN_LOG}"

if [[ "${RERUN_HASHED}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Idempotence check failed! Rerun re-hashed ${RERUN_HASHED} records (expected 0)." >&2
    exit 1
fi

CHECKSUM_AFTER_RERUN=$(compute_checksum)
if [[ "${CHECKSUM_BEFORE_RERUN}" != "${CHECKSUM_AFTER_RERUN}" ]]; then
    echo "ASSERTION FAILED: Database state changed during idempotence rerun!" >&2
    exit 1
fi
echo "Idempotency check passed: 0 new hashes written, zero database modifications."

# Step 9: Hash-only readiness assessment (simulate plaintext nullification)
echo ""
echo "[Step 9/9] Simulating legacy plaintext nullification for hash-only readiness..."
# In initial migrations (V1/V17), persons.ic_or_passport was defined as NOT NULL.
# In Phase 3 (Hash-Only Cutover), a prerequisite schema migration will alter ic_or_passport to DROP NOT NULL.
# Here in the disposable rehearsal database, we simulate that prerequisite schema change before nullification.
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -c "
    -- Simulate Phase 3 prerequisite schema change
    ALTER TABLE persons ALTER COLUMN ic_or_passport DROP NOT NULL;

    -- Null legacy plaintext on migrated records only
    UPDATE persons
    SET ic_or_passport = NULL, identification_value = NULL
    WHERE identification_hash IS NOT NULL
      AND identification_verification_status = 'LEGACY'
      AND id::text LIKE '00000000-0000-0000-0000-%';
" > /dev/null

REMAINING_PLAINTEXT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A \
    -c "SELECT count(*) FROM persons WHERE id::text LIKE '00000000-0000-0000-0000-%' AND identification_verification_status = 'LEGACY' AND (ic_or_passport IS NOT NULL OR identification_value IS NOT NULL);")
if [[ "${REMAINING_PLAINTEXT}" -ne 0 ]]; then
    echo "ASSERTION FAILED: Plaintext remains on migrated records after nullification: ${REMAINING_PLAINTEXT}" >&2
    exit 1
fi

POST_NULL_VIOLATIONS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${TARGET_DB}" -t -A -c "
    SELECT (
        COUNT(CASE WHEN identification_hash IS NOT NULL AND identification_hash !~ '^[0-9a-f]{64}$' THEN 1 END) +
        COUNT(CASE WHEN identification_hash IS NULL AND identification_hash_version IS NOT NULL THEN 1 END) +
        COUNT(CASE WHEN identification_hash IS NOT NULL AND identification_hash_version IS NULL THEN 1 END) +
        COUNT(CASE WHEN identification_hash_version IS NOT NULL AND identification_hash_version <= 0 THEN 1 END)
    ) FROM persons;")
if [[ "${POST_NULL_VIOLATIONS}" -ne 0 ]]; then
    echo "ASSERTION FAILED: V153 constraints violated after plaintext nullification." >&2
    exit 1
fi
echo "Hash-only simulation passed: plaintext safely nullified with zero constraint violations."

echo ""
echo "=============================================================================="
echo " Phase 2.1 Rehearsal completed successfully (all assertions passed)."
echo "=============================================================================="
