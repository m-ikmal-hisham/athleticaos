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
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdentificationBackfillServiceImpl implements IdentificationBackfillService {

    private final PersonRepository personRepository;
    private final IdentificationHashService identificationHashService;

    @Override
    public Map<String, Object> runBackfill(boolean dryRun, int batchSize) {
        int effectiveBatchSize = batchSize > 0 ? batchSize : 100;
        log.info("Starting identification backfill: dryRun={}, batchSize={}", dryRun, effectiveBatchSize);

        long totalProcessed = 0;
        long totalHashed = 0;
        long totalFlagged = 0;
        long totalSkipped = 0;
        long startTime = System.currentTimeMillis();

        UUID lastId = null;

        while (true) {
            Pageable pageable = PageRequest.of(0, effectiveBatchSize);
            Page<Person> page = (lastId == null)
                    ? personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullOrderByIdAsc(pageable)
                    : personRepository.findByIdentificationHashIsNullAndIcOrPassportIsNotNullAndIdGreaterThanOrderByIdAsc(lastId, pageable);

            if (page.isEmpty()) {
                break;
            }

            for (Person person : page.getContent()) {
                lastId = person.getId();
                totalProcessed++;

                String rawIc = person.getIcOrPassport();
                if (rawIc == null || rawIc.isBlank()) {
                    totalSkipped++;
                    continue;
                }

                String normalized = IdentificationUtil.normalize(rawIc);
                if (normalized == null || normalized.isBlank()) {
                    totalSkipped++;
                    continue;
                }

                String hash = identificationHashService.hash(normalized);
                if (hash == null) {
                    totalSkipped++;
                    continue;
                }

                // Check for potential collision with existing hashed record
                Optional<Person> existing = personRepository.findByIdentificationHash(hash);
                if (existing.isPresent() && !existing.get().getId().equals(person.getId())) {
                    totalFlagged++;
                    log.warn("Backfill duplicate collision detected for personId: {}. Flagging status without setting hash.", person.getId());
                    if (!dryRun) {
                        saveFlaggedPerson(person);
                    }
                } else {
                    totalHashed++;
                    if (!dryRun) {
                        saveHashedPerson(person, hash, identificationHashService.getCurrentVersion());
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
        summary.put("totalSkipped", totalSkipped);
        summary.put("durationMs", duration);

        log.info("Identification backfill completed. Summary: dryRun={}, totalProcessed={}, totalHashed={}, totalFlagged={}, totalSkipped={}, durationMs={}",
                dryRun, totalProcessed, totalHashed, totalFlagged, totalSkipped, duration);

        return summary;
    }

    @Transactional
    public void saveHashedPerson(Person person, String hash, int version) {
        person.setIdentificationHash(hash);
        person.setIdentificationHashVersion(version);
        if (person.getIdentificationVerificationStatus() == null) {
            person.setIdentificationVerificationStatus("UNVERIFIED");
        }
        personRepository.save(person);
    }

    @Transactional
    public void saveFlaggedPerson(Person person) {
        person.setIdentificationVerificationStatus("FLAGGED");
        personRepository.save(person);
    }
}
