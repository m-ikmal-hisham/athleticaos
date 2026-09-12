package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.IdentificationBackfillService;
import com.athleticaos.backend.services.IdentificationHashService;
import com.athleticaos.backend.utils.IdentificationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Hardened backfill service for computing HMAC hashes on legacy Person records.
 *
 * <p><strong>Source selection policy:</strong>
 * <ul>
 *   <li>If only {@code ic_or_passport} is usable → use it.</li>
 *   <li>If only {@code identification_value} is usable → use it.</li>
 *   <li>If both normalize to the same value → use that value.</li>
 *   <li>If both normalize differently → flag as conflict.</li>
 *   <li>If neither is usable → skip.</li>
 * </ul>
 *
 * <p><strong>Duplicate detection:</strong>
 * <ul>
 *   <li>Against existing stored hashes in the database.</li>
 *   <li>Among pending records within the current run (in-memory set).</li>
 * </ul>
 *
 * <p><strong>Status assignment:</strong>
 * Successfully backfilled records receive {@code LEGACY} (migrated but not independently verified).
 * Collisions and conflicts receive {@code FLAGGED}.
 *
 * <p><strong>Idempotence:</strong>
 * Records with an existing valid hash at the current version are skipped.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IdentificationBackfillServiceImpl implements IdentificationBackfillService {

    private final PersonRepository personRepository;
    private final IdentificationHashService identificationHashService;
    private final IdentificationBackfillPersister persister;

    @Override
    public Map<String, Object> runBackfill(boolean dryRun, int batchSize) {
        // Refuse to run if HMAC is not configured
        if (!identificationHashService.isConfigured()) {
            throw new IllegalStateException(
                    "Cannot run identification backfill: HMAC service is not configured. "
                    + "Set ATHLETICAOS_IDENTIFICATION_HMAC_SECRET before running backfill.");
        }

        int effectiveBatchSize = batchSize > 0 ? batchSize : 100;
        int currentVersion = identificationHashService.getActiveVersion();
        log.info("Starting identification backfill: dryRun={}, batchSize={}, version={}",
                dryRun, effectiveBatchSize, currentVersion);

        long totalProcessed = 0;
        long totalHashed = 0;
        long totalFlagged = 0;
        long totalSkipped = 0;
        long totalConflicting = 0;
        long totalAlreadyHashed = 0;
        long startTime = System.currentTimeMillis();

        // Track computed hashes within this run to detect in-batch duplicates
        // Maps hash -> first personId that claimed it
        Map<String, UUID> seenHashes = new HashMap<>();

        UUID lastId = null;

        while (true) {
            Pageable pageable = PageRequest.of(0, effectiveBatchSize);
            Page<Person> page = (lastId == null)
                    ? personRepository.findUnhashedWithIdentificationOrderByIdAsc(pageable)
                    : personRepository.findUnhashedWithIdentificationAndIdGreaterThanOrderByIdAsc(lastId, pageable);

            if (page.isEmpty()) {
                break;
            }

            for (Person person : page.getContent()) {
                lastId = person.getId();
                totalProcessed++;

                // Skip if already has a valid hash at the current version (idempotent)
                if (person.getIdentificationHash() != null
                        && person.getIdentificationHashVersion() != null
                        && person.getIdentificationHashVersion() == currentVersion) {
                    totalAlreadyHashed++;
                    continue;
                }

                // Source selection: resolve the identification value
                String resolvedSource = resolveSource(person);
                if (resolvedSource == null) {
                    // Check if this is a conflict (both sources present but different)
                    if (isSourceConflict(person)) {
                        totalConflicting++;
                        totalFlagged++;
                        if (!dryRun) {
                            persister.persistFlaggedPerson(person, "SOURCE_CONFLICT");
                        }
                    } else {
                        totalSkipped++;
                    }
                    continue;
                }

                String hash = identificationHashService.computeHash(resolvedSource);
                if (hash == null) {
                    totalSkipped++;
                    continue;
                }

                // Check for in-batch duplicates
                UUID priorClaim = seenHashes.get(hash);
                if (priorClaim != null && !priorClaim.equals(person.getId())) {
                    totalFlagged++;
                    log.warn("Backfill in-batch duplicate for personId: {} (hash matches personId: {})",
                            person.getId(), priorClaim);
                    if (!dryRun) {
                        persister.persistFlaggedPerson(person, "IN_BATCH_DUPLICATE");
                    }
                    continue;
                }

                // Check for existing stored hash collision
                Optional<Person> existing = personRepository.findByIdentificationHash(hash);
                if (existing.isPresent() && !existing.get().getId().equals(person.getId())) {
                    totalFlagged++;
                    log.warn("Backfill duplicate collision for personId: {} against existing personId: {}",
                            person.getId(), existing.get().getId());
                    if (!dryRun) {
                        persister.persistFlaggedPerson(person, "DB_DUPLICATE");
                    }
                    continue;
                }

                // Success — record hash in seen set and persist
                seenHashes.put(hash, person.getId());
                totalHashed++;
                if (!dryRun) {
                    boolean persisted = persister.persistHashedPerson(person, hash, currentVersion);
                    if (!persisted) {
                        // Unique constraint race — demote to flagged
                        totalHashed--;
                        totalFlagged++;
                        persister.persistFlaggedPerson(person, "CONSTRAINT_RACE");
                    }
                }
            }

            log.info("Identification backfill progress: {} records processed so far...", totalProcessed);
        }

        long duration = System.currentTimeMillis() - startTime;
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("dryRun", dryRun);
        summary.put("totalProcessed", totalProcessed);
        summary.put("totalHashed", totalHashed);
        summary.put("totalFlagged", totalFlagged);
        summary.put("totalConflicting", totalConflicting);
        summary.put("totalSkipped", totalSkipped);
        summary.put("totalAlreadyHashed", totalAlreadyHashed);
        summary.put("durationMs", duration);

        log.info("Identification backfill completed. Summary: dryRun={}, processed={}, hashed={}, "
                + "flagged={}, conflicting={}, skipped={}, alreadyHashed={}, durationMs={}",
                dryRun, totalProcessed, totalHashed, totalFlagged, totalConflicting,
                totalSkipped, totalAlreadyHashed, duration);

        return summary;
    }

    /**
     * Resolves the source identification value from the person record.
     *
     * @return the normalised identification value, or null if neither source is usable
     *         or sources conflict (caller should check isSourceConflict separately)
     */
    private String resolveSource(Person person) {
        String primary = IdentificationUtil.normalize(person.getIcOrPassport());
        String secondary = IdentificationUtil.normalize(person.getIdentificationValue());

        if (primary != null && secondary != null) {
            // Both present — check if they match
            if (primary.equals(secondary)) {
                return primary;
            }
            // Conflict — return null, caller checks isSourceConflict
            return null;
        }
        if (primary != null) {
            return primary;
        }
        return secondary; // may be null
    }

    /**
     * Checks if both source fields normalize to different non-null values (conflict).
     */
    private boolean isSourceConflict(Person person) {
        String primary = IdentificationUtil.normalize(person.getIcOrPassport());
        String secondary = IdentificationUtil.normalize(person.getIdentificationValue());
        return primary != null && secondary != null && !primary.equals(secondary);
    }
}
