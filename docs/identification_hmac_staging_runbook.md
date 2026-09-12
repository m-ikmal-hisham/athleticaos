# AthleticaOS — Identification HMAC Hardening Staging Runbook (Phase 2.1)

**Target Environment:** Staging  
**Audience:** Platform Engineering / DevOps / Security Leads  
**Version:** 2.1.0  
**Last Updated:** 2026-09-09  

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

### 2.2 Backup, Recovery & Key Rotation Limitations
> [!CAUTION]
> **Key Rotation Invalidation:** HMAC-SHA256 is deterministic with respect to the secret key. If `ATHLETICAOS_IDENTIFICATION_HMAC_SECRET` is changed or lost:
> 1. All existing stored hashes become invalid for duplicate lookup.
> 2. Once plaintext is nullified in Phase 3, historical hashes **cannot** be recomputed under a new key without original plaintext.
> 3. Therefore, the secret key must be stored securely in the organization's secrets vault (e.g. AWS Secrets Manager, HashiCorp Vault) and backed up alongside database backups.

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

## 4. Deployment Procedure

### 4.1 Deployment Order
1. **Provision Secret:** Set `ATHLETICAOS_IDENTIFICATION_HMAC_SECRET` in staging environment configuration.
2. **Apply Flyway Migration V153:**
   ```bash
   mvn flyway:migrate -Dflyway.target=153
   ```
   *Note: `V153__harden_identification_hash_constraints.sql` uses `NOT VALID` followed by `VALIDATE CONSTRAINT` to avoid long exclusive table locks.*
3. **Deploy Backend Artifact:** Deploy backend with backfill runner **disabled** (`athleticaos.backfill.identification.enabled=false`).
4. **Smoke Test Normal Operation:**
   - Create a player with a valid Malaysian IC -> verify HTTP 201 response.
   - Verify database row has both `identification_hash` and `identification_hash_version = 1`.
   - Update player's team or name -> verify identification hash and version remain unchanged.

---

## 5. Controlled Backfill Execution

The backfill runner processes unhashed legacy records in batches, resolving primary vs secondary sources, detecting duplicate collisions, and updating records to `LEGACY` status.

### 5.1 Write-Freeze Window
For staging rehearsal, a write freeze is optional. For production, schedule a low-traffic window or temporary write freeze on player registration to prevent concurrency anomalies.

### 5.2 Step 1: Controlled Dry-Run
Run the application with dry-run enabled:
```bash
java -jar backend.jar \
  --spring.profiles.active=staging \
  --athleticaos.backfill.identification.enabled=true \
  --athleticaos.backfill.identification.dry-run=true \
  --athleticaos.backfill.identification.batch-size=200
```
**Verify:**
- Check application logs: summary displays `processed`, `hashed`, `flagged`, `conflicting`, `skipped`, `alreadyHashed`.
- Run `backend/scripts/verify_identification_backfill.sql` -> confirm zero rows have new hashes written.

### 5.3 Step 2: Live Backfill Run
```bash
java -jar backend.jar \
  --spring.profiles.active=staging \
  --athleticaos.backfill.identification.enabled=true \
  --athleticaos.backfill.identification.dry-run=false \
  --athleticaos.backfill.identification.batch-size=200
```

### 5.4 Step 3: Verify Integrity & Idempotency
1. Run verification script:
   ```bash
   psql -h <staging-db-host> -U athleticaos_user -d athleticaos_staging \
     -f backend/scripts/verify_identification_backfill.sql
   ```
2. **Check Acceptance Criteria:**
   - Unhashed records with valid IC should be 0 (except those classified as `FLAGGED` or empty).
   - All hashed records have `identification_hash_version = 1`.
   - All newly hashed records have `identification_verification_status = 'LEGACY'`.
   - Constraint integrity checks all report `PASS`.
3. **Verify Idempotency:**
   - Rerun backfill command with `--athleticaos.backfill.identification.dry-run=false`.
   - Confirm log reports `hashed=0` and `alreadyHashed` equals prior total.

---

## 6. Rollback & Remediation Limits

- If migration V153 fails during deployment: V153 uses transactional DO blocks; if a constraint cannot validate, the migration rolls back cleanly without affecting V152.
- If backfill encounters unexpected errors: The backfill runner uses `REQUIRES_NEW` per record/batch; committed batches remain intact while uncommitted batches roll back safely.
- If needed, the runner can be killed safely at any time (Ctrl+C / SIGTERM). Rerunning resumes from the last unhashed record.

---

## 7. Future Phases & Privacy Governance

### 7.1 Road to Phase 3 (Hash-Only Cutover)
1. **Audit Frontend & API Consumers:** Replace any remaining UI fields displaying raw IC with masked display (`isIdentificationPresent: true`).
2. **Nullify Legacy Plaintext:** Execute SQL updating `ic_or_passport = NULL, identification_value = NULL` for records where `identification_hash IS NOT NULL`.
3. **Drop Plaintext Columns:** Once zero application references exist, drop `ic_or_passport` and `identification_value`.

### 7.2 Privacy Clarifications (PDPA & ISO 27001)
- **Hashing ≠ Anonymization:** A pseudonymous HMAC hash is still personal data under PDPA because it can be used to single out or correlate individuals.
- **DOB and Gender:** Date of birth and gender remain personal data and must receive standard access controls.
- **Validation ≠ Verification:** Format validation (e.g. 12 digits, valid date prefix) confirms syntax compliance, NOT that the individual legitimately owns that identity.
- **Manual Collection Guidance:** If an official or admin must inspect an original identity card at tournament check-in, inspect the physical card visually without photocopying or recording the number into unencrypted note fields.
