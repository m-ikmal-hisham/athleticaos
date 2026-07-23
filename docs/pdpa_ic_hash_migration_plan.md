# PDPA/ISO — `ic_or_passport` → `identification_hash` Migration

**Status:** DEFERRED — planned, not yet implemented. Parked here on 2026-07-18 to resume later
(intended to be picked up in Google Antigravity or any other agent/IDE — this doc is written to be
self-contained so a fresh session with no memory of the planning conversation can execute it).

**Owner:** ops@karunasarawak.com
**Branch:** `dev`
**Repo:** athleticaos (backend = Spring Boot / Postgres+Flyway prod, H2 in tests; frontend = React/Vite)

---

## 0. Why

`persons.ic_or_passport` currently stores Malaysian IC / passport numbers **in plain text** in the
`Person` entity (`backend/src/main/java/com/athleticaos/backend/entities/Person.java:38-39`). This is
raw PII (IC numbers encode DOB + gender) sitting unencrypted in the DB, in API responses
(`PlayerResponse`, `PersonResponseDTO`, `PersonSummaryDTO`), and — see §4 — leaking into application
logs. Goal: store only a one-way hash, never the plaintext, while still being able to (a) detect
duplicate registrations, (b) cross-validate the IC's embedded DOB/gender against submitted form
fields, and (c) show the admin a masked confirmation string instead of the raw value.

---

## 1. Open decisions to make before implementing

### 1a. Hash construction — bare SHA-256 vs HMAC-SHA256 with a pepper

The original ask was literally "SHA-256". **Flag before implementing:** a bare, unsalted SHA-256 of a
normalized Malaysian IC (12 numeric digits after stripping the dash) has only 10^12 possible inputs.
That's brute-forceable / rainbow-table-able in hours on a single consumer GPU if the `persons` table
ever leaks (backup, breach, misconfigured snapshot). For genuine ISO 27001 / PDPA-grade protection,
prefer:

```java
Mac mac = Mac.getInstance("HmacSHA256");
mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
byte[] hashBytes = mac.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
```

where `pepper` is a long random secret pulled from env/secrets manager (`IDENTIFICATION_HASH_PEPPER`),
**never committed to the repo**, rotated independently of any single DB. This still allows exact-match
duplicate lookups (same input + same pepper → same hash) but makes offline brute force infeasible
without also stealing the pepper (e.g., from AWS Secrets Manager / EC2 env, not just an RDS snapshot).

**Decision needed:** plain SHA-256 (simpler, matches the literal spec) vs HMAC-SHA256+pepper
(materially more secure, small added ops burden of managing a secret). Recommend the latter given this
is explicitly a PDPA/ISO compliance initiative — pick one before writing `IdentificationUtil`.

### 1b. Masked display strategy

A one-way hash cannot be reversed to show `***-**-1234` on a later `GET` — only the hash remains.
Two options:

- **Option B (recommended):** on `create`/`update` (same request that received the raw plaintext),
  build the masked string from the in-memory value *before* hashing/discarding it, and return that
  once. Every other read (`GET`, list, search) returns a constant `"PRESENT"` (or `null` if unset).
  Zero plaintext retention anywhere.
- **Option A:** persist last-4 plaintext digits in a separate column so `GET` can always show a
  partial mask. This is itself a (small) PII retention that undercuts the point of hashing — only do
  this if there's a hard product requirement for it.

Went with Option B in the drafted plan below. Confirm this is still right before implementing.

---

## 2. Full implementation plan (as drafted 2026-07-18)

### Files touched

| File | Change |
|---|---|
| `backend/src/main/resources/db/migration/V146__replace_ic_or_passport_with_identification_hash.sql` | new migration |
| `backend/src/main/java/com/athleticaos/backend/entities/Person.java` | `icOrPassport` → `identificationHash` |
| `backend/src/main/java/com/athleticaos/backend/utils/IdentificationUtil.java` | new — normalize/hash/validate/mask |
| `backend/src/main/java/com/athleticaos/backend/repositories/PersonRepository.java` | hash-based exists/lookup, drop substring search on IC |
| `backend/src/main/java/com/athleticaos/backend/repositories/OrganisationPersonRepository.java` | drop substring search on IC |
| `backend/src/main/java/com/athleticaos/backend/services/impl/PlayerServiceImpl.java` | hash on create/update/batch, mask response |
| `backend/src/main/java/com/athleticaos/backend/services/impl/PersonServiceImpl.java` | hash on create/update, mask response |
| `backend/src/main/java/com/athleticaos/backend/services/impl/PlayerBatchHelperImpl.java` | hash + validate on batch insert |
| `backend/src/main/java/com/athleticaos/backend/services/impl/OrganisationServiceImpl.java` | hash on `registerPerson`, mask response |
| `backend/src/main/java/com/athleticaos/backend/services/impl/SeedingServiceImpl.java` | seed hashed fake IC |
| `backend/src/main/java/com/athleticaos/backend/exceptions/GlobalExceptionHandler.java` | constraint-name string match (`ic_or_passport` → `identification_hash`) |
| `backend/src/main/java/com/athleticaos/backend/dtos/player/PlayerResponse.java` | `icOrPassport` → `identificationMasked` |
| `backend/src/main/java/com/athleticaos/backend/dtos/person/PersonResponseDTO.java` | same |
| `backend/src/main/java/com/athleticaos/backend/dtos/team/PersonSummaryDTO.java` | same |
| `backend/src/test/java/com/athleticaos/backend/services/StatisticsServiceIntegrationTest.java` | build `Person` with `identificationHash(...)` |

Request DTOs (`CreatePersonRequest`, `PersonUpdateRequest`, `RegisterPersonRequest`,
`PlayerCreateRequest`, `PlayerUpdateRequest`, `PlayerRowDTO`) **keep** their `icOrPassport` field name —
clients still submit raw plaintext on create/update; only storage and response output change.

### Migration SQL

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE persons ADD COLUMN identification_hash VARCHAR(64);

UPDATE persons
SET identification_hash = encode(
    digest(upper(regexp_replace(ic_or_passport, '[^A-Za-z0-9]', '', 'g')), 'sha256'),
    'hex'
)
WHERE ic_or_passport IS NOT NULL AND TRIM(ic_or_passport) <> '';
-- NOTE: switch digest() call to HMAC (hmac(data, key, 'sha256')) if §1a picks the pepper option —
-- pgcrypto's hmac() function supports this natively, pepper passed as a Flyway placeholder or
-- a one-off manually-run backfill script outside version control (don't put the pepper in a
-- checked-in migration file).

ALTER TABLE persons DROP CONSTRAINT IF EXISTS uc_persons_ic_or_passport;
ALTER TABLE persons DROP COLUMN ic_or_passport;

ALTER TABLE persons ALTER COLUMN identification_hash SET NOT NULL;
ALTER TABLE persons ADD CONSTRAINT uc_persons_identification_hash UNIQUE (identification_hash);
```

Irreversible: plaintext ICs are gone after `DROP COLUMN`. Snapshot the table before running in any
real environment. See §4 for why staging needs its own remediation *before* this runs there.

### `IdentificationUtil.java` (new)

```java
package com.athleticaos.backend.utils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.regex.Pattern;

public final class IdentificationUtil {

    private static final Pattern MALAYSIAN_IC_PATTERN = Pattern.compile("^\\d{12}$");
    public static final String PRESENT = "PRESENT";

    private IdentificationUtil() {}

    public static String normalize(String raw) {
        if (raw == null) return null;
        return raw.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    /** One-way SHA-256 hex digest. See plan §1a re: switching to HMAC-SHA256+pepper. */
    public static String hash(String normalized) {
        if (normalized == null || normalized.isEmpty()) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    public static boolean isMalaysianIc(String normalized) {
        return normalized != null && MALAYSIAN_IC_PATTERN.matcher(normalized).matches();
    }

    /** Cross-validates a 12-digit Malaysian IC's embedded DOB (YYMMDD) and gender digit. No-op for non-IC values. */
    public static void validateMalaysianIc(String normalizedIc, LocalDate dob, String gender) {
        if (!isMalaysianIc(normalizedIc)) return;
        if (dob == null) {
            throw new IllegalArgumentException("Date of birth is required to validate a Malaysian IC");
        }

        int icYY = Integer.parseInt(normalizedIc.substring(0, 2));
        int icMM = Integer.parseInt(normalizedIc.substring(2, 4));
        int icDD = Integer.parseInt(normalizedIc.substring(4, 6));

        if (icYY != dob.getYear() % 100 || icMM != dob.getMonthValue() || icDD != dob.getDayOfMonth()) {
            throw new IllegalArgumentException("Date of birth does not match the date embedded in the IC number");
        }

        if (gender == null || !(gender.equalsIgnoreCase("MALE") || gender.equalsIgnoreCase("FEMALE"))) {
            throw new IllegalArgumentException("Gender must be MALE or FEMALE for a Malaysian IC");
        }

        int lastDigit = Character.getNumericValue(normalizedIc.charAt(11));
        String expectedGender = (lastDigit % 2 != 0) ? "MALE" : "FEMALE";
        if (!expectedGender.equalsIgnoreCase(gender)) {
            throw new IllegalArgumentException(
                    "Gender does not match the gender encoded in the IC number (expected " + expectedGender + ")");
        }
    }

    /** Masks a raw ID for display. Only call with plaintext held transiently in-request — never persist the result. */
    public static String mask(String raw) {
        String normalized = normalize(raw);
        if (normalized == null || normalized.isEmpty()) return null;
        if (normalized.length() <= 4) return "*".repeat(normalized.length());
        String visible = normalized.substring(normalized.length() - 4);
        return "*".repeat(normalized.length() - 4) + visible;
    }
}
```

### Repository changes

`PersonRepository`: drop `LOWER(p.icOrPassport) LIKE ...` from `searchAllPersons` (hashes aren't
substring-searchable); replace `existsByIcOrPassport(String)` / `existsByIcOrPassportAndIdNot(String, UUID)`
with `existsByIdentificationHash` / `existsByIdentificationHashAndIdNot`; drop the unused
`findAllByIcOrPassportNormalized`.

`OrganisationPersonRepository`: drop the same `LIKE` clause from `searchPersonsByOrganisationIds`.

**Behavior change:** admins lose partial/substring IC search — only exact full-value match works
going forward (inherent to hashing). Worth a heads-up to whoever uses that search box.

### Service impl changes (pattern, applied identically in all 4)

```java
String normalizedIc = IdentificationUtil.normalize(request.icOrPassport());
IdentificationUtil.validateMalaysianIc(normalizedIc, request.dob(), request.gender());
String icHash = IdentificationUtil.hash(normalizedIc);
if (personRepository.existsByIdentificationHash(icHash)) {
    throw new /* DuplicateIcException or IllegalArgumentException, matches existing per-file convention */ ...;
}
// ... person.setIdentificationHash(icHash) instead of setIcOrPassport(normalizedIc)
```

`PlayerServiceImpl.mapToPlayerResponse` needs an overload taking an explicit masked string, so
`createPlayer`/`updatePlayer` can pass `IdentificationUtil.mask(request.icOrPassport())` (plaintext
still in scope at that point) while the plain no-arg path (regular `GET`) falls back to
`identificationHash != null ? IdentificationUtil.PRESENT : null`.

`PersonServiceImpl.createPerson`/`updatePerson` currently return via `getPersonById(...)` — a fresh DB
read with no plaintext left in scope, so they'll return `PRESENT` even right after creation unless
refactored to build the DTO inline instead of round-tripping through the DB. Decide if that's
acceptable or worth the extra refactor.

Also fix while touching this code (see §4): `PlayerServiceImpl.java:368` and `:380` currently
`log.debug`/`log.warn` the **plaintext** normalized IC — strip the value from those log lines
entirely as part of this change, independent of the hashing work itself.

### DTO renames

`PlayerResponse.icOrPassport` → `identificationMasked`, `PersonResponseDTO.icOrPassport` →
`identificationMasked`, `PersonSummaryDTO.icOrPassport` → `identificationMasked`. Request-side DTOs
unchanged.

### Frontend impact (not scoped/implemented yet)

`icOrPassport` is read in ~11 frontend files (`types/index.ts`, `PlayerModal.tsx`, `EditPlayer.tsx`,
`PeopleDirectory.tsx`, `persons.api.ts`, `CreatePersonModal.tsx`, `EditPersonModal.tsx`,
`RegisterOfficialModal.tsx`, `BulkPasteRosterModal.tsx`, `TeamStaffPanel.tsx`, `CreatePlayer.tsx`).
Once the API stops returning the raw value:
- "Edit" forms that currently pre-fill the IC field from the API response will break — they need to
  become always-blank "enter to replace" fields.
- Any display/formatting logic needs to switch to `identificationMasked` and handle the `"PRESENT"`
  constant.

### Test file

`StatisticsServiceIntegrationTest.java` builds `Person` entities directly (`@DataJpaTest`, H2,
`ddl-auto=create-drop`, Flyway disabled — schema comes straight from the entity, so this test needs
source changes regardless of the SQL migration):

```java
.identificationHash(IdentificationUtil.hash("123456789"))
```
in place of `.icOrPassport("123456789")` (and the second occurrence with `"123" + fName + lName`).

---

## 3. Staging data risk & remediation strategy

### Why this is a real, current risk (not hypothetical)

Staging (`docs/staging_deployment_guide.md`) is a live AWS RDS Postgres instance (`athleticaos-staging-db`,
`db.t3.micro`), not an ephemeral or purely synthetic environment. The deployment guide's own smoke-test
checklist has team members manually clicking through "Tournament CRUD operations" and player/roster
flows in a browser against this DB. `PlayerCreateRequest.icOrPassport` is `@NotBlank` — the form can't
be submitted without *some* value, and it's very plausible whoever was testing typed their own real
Malaysian IC rather than inventing a fake one, especially for early manual QA before `SeedingServiceImpl`
existed or was wired into staging.

Compounding factor: `SeedingServiceImpl` generates fake IDs via `faker.number().digits(12)` — a random
12-digit string that is **structurally indistinguishable** from a real Malaysian IC. Pattern-matching
`ic_or_passport` values (e.g. regex `^\d{6}-?\d{2}-?\d{4}$`) cannot tell seeded-fake from staff-entered-real.

### Step 1 — Immediate, independent of the hashing migration

- Rotate/restrict staging RDS master credentials and confirm who currently has the `.env.staging` file
  and EC2 SSH access (`athleticaos-staging-backend.pem`) — that's everyone who can currently read
  plaintext ICs straight out of the DB or Docker logs today.
- Fix the two log statements identified above (`PlayerServiceImpl.java:368`, `:380`) that print the
  plaintext IC — this leaks into `docker logs athleticaos-backend`, which per the deployment guide is
  routinely read during troubleshooting (`docker logs athleticaos-backend --tail 50`) and is not itself
  access-controlled beyond EC2 SSH.
- Check whether any RDS automated/manual **snapshots** already exist (the guide's rollback plan
  references `aws rds restore-db-instance-from-db-snapshot`) — those snapshots retain today's plaintext
  regardless of what you do to the live table, and aren't remediated by fixing live data. Review
  snapshot retention/deletion policy for the ones taken before remediation.

### Step 2 — Don't try to forensically sort real vs. fake staging rows

Because seeded-fake and staff-entered-real ICs look identical, trying to identify and selectively purge
"the real ones" is unreliable and risks leaving some real PII behind. Recommended approach instead:

**Wipe and reseed staging's `persons`/`players`/dependent tables entirely** before (or as part of)
deploying the `identification_hash` migration there, rather than backfilling real staging data into the
one-way hash. Concretely:
1. Take a final RDS snapshot for audit/rollback purposes (access-restricted, short retention).
2. Truncate `persons` and everything that FKs to it in dependency order (`match_events`,
   `match_lineups`, `player_teams`, `players`, `tournament_players`, `team_staff`,
   `official_registry`, `tournament_staff`, `tournament_officials`, `organisation_persons` — confirm
   full FK graph before truncating; `ON DELETE CASCADE` may cover some of this already per the V17
   migration).
3. Reseed with `SeedingServiceImpl` (already produces synthetic org/team/player data) so staging has
   working test data again without ever having held anyone's real IC.
4. *Then* run the `V146` migration on the now-synthetic staging DB — backfill only ever touches
   Faker-generated values.

This sidesteps needing to identify which historical rows were real, and gives you a clean baseline to
verify the new hashing flow works end-to-end before touching production.

### Step 3 — Prevent recurrence

Add a line to `docs/testing_guide.md` (or wherever QA process is documented): **never enter real
personal identification numbers when testing on staging** — use `SeedingServiceImpl`-style synthetic
data or an obviously-fake pattern (e.g. a documented dummy range) instead. Staging has broader
practical access (SSH, Docker logs, DB snapshots) than production and is not currently held to the
same PDPA handling standard.

### Production

Production presumably *should* retain real user data (that's the point of the product), so §2's
migration applies as-is there — no wipe/reseed, just the backfill-then-drop-column migration, with the
snapshot-before-migrating precaution already noted in §2.

---

## 4. Suggested execution order when resumed

1. Decide §1a (plain SHA-256 vs HMAC+pepper) and §1b (masking strategy) — both affect the code below.
2. Fix the two plaintext-IC log statements in `PlayerServiceImpl.java` — independent, ship immediately.
3. Staging: snapshot → truncate → reseed (§3 Step 2), *before* running any hash migration there.
4. Implement `IdentificationUtil.java` (new, no dependents — safe first commit).
5. `Person.java` + repositories + all 4 service impls + `SeedingServiceImpl.java` +
   `GlobalExceptionHandler.java` as one commit (they depend on each other to compile).
6. DTOs (`PlayerResponse`, `PersonResponseDTO`, `PersonSummaryDTO`).
7. Update `StatisticsServiceIntegrationTest.java`.
8. `mvn -pl backend compile test` — confirm build + tests pass.
9. Migration `V146` — apply to the now-reseeded staging first, verify, then production (with backup).
10. Frontend follow-up pass (separate piece of work, not yet scoped).

## 5. Open questions to resolve when resuming

- [ ] Plain SHA-256 or HMAC-SHA256 + pepper? (§1a)
- [ ] Confirm Option B masking (transient mask on create/update, `PRESENT` elsewhere) is still desired. (§1b)
- [ ] Should `Person.identificationValue`/`identificationType` (a second, independent plaintext ID
      copy found during this analysis — see `PlayerCreateRequest`, `SeedingServiceImpl`) be folded into
      the same remediation? Not in original scope but undermines the same goal.
- [ ] Who has current access to staging DB credentials / EC2 SSH, and does it need trimming as part of
      this? (§3 Step 1)
- [ ] Confirm full FK dependency graph before truncating staging `persons` (§3 Step 2) — don't want a
      truncate to fail partway or leave orphans.
- [ ] Any existing RDS snapshots to review/expire after remediation? (§3 Step 1)
