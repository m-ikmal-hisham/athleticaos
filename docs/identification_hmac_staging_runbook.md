# AthleticaOS — Identification HMAC Hardening Staging Runbook (Phase 2.1)

**Target Environment:** Staging  
**Audience:** Platform Engineering / DevOps / Security Leads  
**Version:** 2.1.0  
**Last Updated:** 2026-09-12  

---

## 1. Executive Summary & State of Migration

### 1.1 What Phase 2.1 Achieves
- **Hardened HMAC-SHA256 Storage:** Dual-write pattern persists HMAC-SHA256 hash alongside version (`identification_hash_version = 1`) whenever identification data is created or updated.
- **Database Integrity Constraints (V153):** Enforces 64-character lowercase hex hashes, atomicity (hash and version must both be present or both null), and positive version numbers at the PostgreSQL constraint level.
- **Atomic Application Writes:** Centralized via `IdentificationHashResult.compute(...)` across all mutation pathways (person service, player service, batch helpers, seeding, organisation registration).
- **Transaction-Safe Backfill Service:** `IdentificationBackfillPersister` isolates record updates into `REQUIRES_NEW` transactions, preventing transaction boundary bypasses and gracefully handling unique constraint race conditions.
- **PII Exposure Elimination:** Removed committed dev secret; eliminated Hibernate BasicBinder `TRACE` logging; removed names and raw identifiers from backfill verification scripts; excluded sensitive fields from `Person.toString()`.
- **Status Classification:** Successfully migrated records receive status `LEGACY` (migrated but not independently verified). Collisions and conflicting dual sources receive `FLAGGED`.

### 1.2 Plaintext Dependencies That Remain (Dual-Run Mode)
During Phase 2.1, **plaintext identification columns (`ic_or_passport` and `identification_value`) are deliberately retained**.
- Existing legacy read operations continue to function during dual-run.
- Administrative exports, identity verification workflows, and legacy tournament eligibility checks that read plaintext remain operational.
- **Plaintext removal is deferred to Phase 3 (Hash-Only Cutover)** after full verification on staging and production.

---

## 2. Key Management & Secret Provisioning

### 2.1 Secret Requirements
- **Algorithm:** HMAC-SHA256
- **Secret Size:** Exactly 256 bits (32 bytes), Base64-encoded.
- **Key Generation Command:**
  ```bash
  openssl rand -base64 32
  ```
- **Environment Variables Required on Staging Container/Host:**
  ```bash
  ATHLETICAOS_IDENTIFICATION_HMAC_SECRET="<base64-encoded-32-byte-secret>"
  ATHLETICAOS_IDENTIFICATION_HMAC_VERSION="1"
  IDENTIFICATION_HMAC_REQUIRED="true"
  ```

### 2.2 Key Isolation & Invalidation Limitations
> [!CAUTION]
> **Environment Key Separation & Rotation Invalidation:**
> 1. **Strict Key Separation:** Staging and production HMAC keys **must differ** from each other and from any development key. Never reuse a development or local test key in staging or production.
> 2. **Key Rotation Invalidation:** HMAC-SHA256 is deterministic with respect to the secret key. If `ATHLETICAOS_IDENTIFICATION_HMAC_SECRET` is changed, **every existing stored hash in the database is invalidated** for duplicate lookup and cross-referencing.
> 3. Once plaintext is nullified in Phase 3, historical hashes **cannot** be recomputed under a new key without original plaintext.
> 4. Therefore, the secret key must be stored securely in the organization's secrets vault (e.g. AWS Secrets Manager, HashiCorp Vault) and backed up alongside database backups.

---

## 3. Staging Pre-Deployment Preflight

Before applying any migration or deploying code to staging, run the read-only preflight query:

```bash
psql -h <staging-db-host> -U athleticaos_user -d athleticaos_staging \
  -f backend/scripts/preflight_v153.sql
```

### Preflight Criteria:
- **`malformed_hash_count` must be 0.**
- **`orphan_hash_count` (hash present, version null) must be 0.**
- **`orphan_version_count` (version present, hash null) must be 0.**
- **`invalid_version_count` (version <= 0) must be 0.**

If any count > 0, halt deployment and review records using restricted UUID queries. Do not proceed until data satisfies V153 constraints.

---

## 4. Staging Identification Data Privacy Decision (Mandatory Gate)

> [!CAUTION]
> **Privacy Governance & Irreversibility Warning:**
> The staging database may contain real Malaysian Identity Card (IC) or passport numbers entered during manual QA and user testing, rather than synthetic identifiers.
> Backfilling HMAC hashes for real identifiers preserves those identities indefinitely in a pseudonymous form that **cannot be reviewed or inspected** once plaintext is dropped in Phase 3. Under the Malaysian Personal Data Protection Act (PDPA), pseudonymized data remains personal data.
>
> **The deployment team MUST NOT proceed with deployment or backfill until the following decision is explicitly reviewed, approved, and recorded.**
> *(Note: A separate, independent privacy review and decision must be made for the production environment prior to production deployment).*

### 4.1 Remediation Options

#### Option A: Backfill Staging As-Is
- **What happens to existing rows:** All existing records with identification data are hashed with `identification_hash_version = 1` and assigned status `LEGACY`. Any real IC/passport entered during QA becomes a permanent pseudonymous record.
- **What becomes irreversible:** Once plaintext is dropped in Phase 3, it becomes mathematically impossible to inspect, audit, or identify which records contained real human identification numbers.
- **Prerequisites & Requirements:**
  - Must confirm that staging's data contents are legally lawful and compliant to retain under organization privacy policies.
  - Must confirm that the staging HMAC key is unique and strictly separated from the development key.
  - Advantage: Fastest deployment, preserves existing QA data history and relationships.

#### Option B: Wipe Identification Data & Reseed Staging (Conservative Non-Production Default)
- **What happens to existing rows:** Identification columns (`ic_or_passport`, `identification_value`, `identification_hash`, `identification_hash_version`) are cleared for existing staging persons, or staging is reseeded with synthetic test fixtures (e.g. `scripts/synthetic_fixtures.sql`). Person/player UUIDs and structural relationships can be preserved if only identification columns are wiped.
- **What becomes irreversible:** Pre-existing identity-linked manual test scenarios on staging are reset.
- **Prerequisites & Requirements:**
  - Acceptance of test corpus reset by QA and product teams.
  - Advantage: Eliminates all real PII from a non-production environment, ensuring zero privacy exposure or lingering pseudonymous leakage.
  - **This is the recommended, conservative default for non-production environments.**

#### Option C: Selective Remediation
- **What happens to existing rows:** Records identified as containing real individual identifiers are nullified or replaced with synthetic test values before or after backfill; synthetic QA fixtures are backfilled normally.
- **What becomes irreversible:** Any real identifier that is missed prior to plaintext deletion becomes permanently retained as an unreviewable hash.
- **Prerequisites & Requirements:**
  - Requires a documented, reliable method to definitively distinguish real identification numbers from synthetic test numbers in the staging database. If records cannot be reliably distinguished, this option cannot be used.

### 4.2 Recorded Approval Gate
Before executing any migration or deployment steps below, record the authorized decision:

| Field | Record |
| :--- | :--- |
| **Chosen Option (A / B / C)** | `___________________________________` |
| **Approved By (Name & Role)** | `___________________________________` |
| **Approval Date** | `___________________________________` |
| **Notes / Exceptions** | `___________________________________` |

*(This gate applies strictly to Staging. A separate privacy decision record is required for Production).*

---

## 5. Deployment Procedure

### 5.1 Deployment Order
1. **Provision Secret:** Set `ATHLETICAOS_IDENTIFICATION_HMAC_SECRET` in staging environment configuration. Confirm it is distinct from dev and production keys.
2. **Apply Flyway Migration V153:**
   Execute migration using the packaged backend jar in non-web mode:
   ```bash
   java -jar backend.jar \
     --spring.main.web-application-type=none \
     --spring.jpa.hibernate.ddl-auto=none \
     --spring.flyway.enabled=true \
     --spring.flyway.target=153 \
     --athleticaos.backfill.identification.enabled=false
   ```
   *Note: `V153__harden_identification_hash_constraints.sql` adds three immediate CHECK constraints: `chk_persons_identification_hash_format`, `chk_persons_hash_version_consistency`, and `chk_persons_hash_version_positive`. These constraints validate immediately upon addition (they do NOT use `NOT VALID` / `VALIDATE CONSTRAINT`). Preflight checks in Section 3 MUST pass before applying V153.*
3. **Deploy Backend Artifact:** Deploy backend with backfill runner **disabled** (`athleticaos.backfill.identification.enabled=false`).
4. **Smoke Test Normal Operation:**
   - Create a player with a valid Malaysian IC -> verify HTTP 200 response.
   - Verify database row has both `identification_hash` and `identification_hash_version = 1`.
   - Update player's team or name -> verify identification hash and version remain unchanged.

---

## 6. Controlled Backfill Execution

The backfill runner processes unhashed legacy records in batches, resolving primary vs secondary sources, detecting duplicate collisions, and updating records to `LEGACY` status.

### 6.1 Write-Freeze Window
For staging rehearsal, a write freeze is optional. For production, schedule a low-traffic window or temporary write freeze on player registration to prevent concurrency anomalies.

### 6.2 Step 1: Controlled Dry-Run
Run the application with dry-run enabled (pass credentials and HMAC secret via environment variables to keep secrets out of process lists):
```bash
java -jar backend.jar \
  --spring.profiles.active=staging \
  --spring.main.web-application-type=none \
  --spring.jpa.hibernate.ddl-auto=none \
  --spring.flyway.enabled=false \
  --athleticaos.backfill.identification.enabled=true \
  --athleticaos.backfill.identification.dry-run=true \
  --athleticaos.backfill.identification.batch-size=200
```
**Verify:**
- Check application logs: summary displays `processed`, `hashed`, `flagged`, `conflicting`, `skipped`, `alreadyHashed`.
- Run `backend/scripts/verify_identification_backfill.sql` -> confirm zero rows have new hashes written.

### 6.3 Step 2: Live Backfill Run
```bash
java -jar backend.jar \
  --spring.profiles.active=staging \
  --spring.main.web-application-type=none \
  --spring.jpa.hibernate.ddl-auto=none \
  --spring.flyway.enabled=false \
  --athleticaos.backfill.identification.enabled=true \
  --athleticaos.backfill.identification.dry-run=false \
  --athleticaos.backfill.identification.batch-size=200
```

### 6.4 Step 3: Verify Integrity & Idempotency
1. Run verification script:
   ```bash
   psql -h <staging-db-host> -U athleticaos_user -d athleticaos_staging \
     -f backend/scripts/verify_identification_backfill.sql
   ```
2. **Check Acceptance Criteria:**
   - Unhashed records with valid IC should be 0 (except those classified as `FLAGGED` or empty).
   - All hashed records have `identification_hash_version = 1`.
   - All newly hashed records have `identification_verification_status = 'LEGACY'`.
   - Constraint integrity checks all report `PASS` (0 violations).
3. **Verify Idempotency:**
   - Rerun backfill command with `--athleticaos.backfill.identification.dry-run=false`.
   - Confirm log reports `hashed=0` and `alreadyHashed` equals prior total.

---

## 7. Rollback & Remediation Limits

- If migration V153 fails during deployment: V153 uses transactional DO blocks; if a constraint cannot validate, the migration rolls back cleanly without affecting V152.
- If backfill encounters unexpected errors: The backfill runner uses `REQUIRES_NEW` per record/batch; committed batches remain intact while uncommitted batches roll back safely.
- If needed, the runner can be killed safely at any time (Ctrl+C / SIGTERM). Rerunning resumes from the last unhashed record.

---

## 8. Future Phases & Privacy Governance

### 8.1 Road to Phase 3 (Hash-Only Cutover)
1. **Audit Frontend & API Consumers:** Replace any remaining UI fields displaying raw IC with masked display (`isIdentificationPresent: true`).
2. **Prerequisite Schema Migration (Drop NOT NULL):** In initial migrations (V1/V17), `persons.ic_or_passport` was defined as `NOT NULL`. Before plaintext can be nullified, a schema migration must execute:
   ```sql
   ALTER TABLE persons ALTER COLUMN ic_or_passport DROP NOT NULL;
   ```
3. **Nullify Legacy Plaintext:** Execute SQL updating `ic_or_passport = NULL, identification_value = NULL` for records where `identification_hash IS NOT NULL`.
4. **Drop Plaintext Columns:** Once zero application references exist, drop `ic_or_passport` and `identification_value`.

### 8.2 Privacy Clarifications (PDPA & ISO 27001)
- **Hashing ≠ Anonymization:** A pseudonymous HMAC hash is still personal data under PDPA because it can be used to single out or correlate individuals.
- **DOB and Gender:** Date of birth and gender remain personal data and must receive standard access controls.
- **Validation ≠ Verification:** Format validation (e.g. 12 digits, valid date prefix) confirms syntax compliance, NOT that the individual legitimately owns that identity.
- **Manual Collection Guidance:** If an official or admin must inspect an original identity card at tournament check-in, inspect the physical card visually without photocopying or recording the number into unencrypted note fields.
