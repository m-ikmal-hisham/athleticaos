package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.PersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Separate component for backfill persistence to ensure Spring AOP proxies
 * correctly intercept @Transactional methods. Self-invocation within the same
 * class bypasses proxy transactions, so this must be a separate bean.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdentificationBackfillPersister {

    private final PersonRepository personRepository;

    /**
     * Persists hash, version, and LEGACY status on a person record.
     * Catches unique constraint violations and converts them to FLAGGED status.
     *
     * @return true if hash was successfully persisted, false if converted to FLAGGED
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean persistHashedPerson(Person person, String hash, int version) {
        try {
            person.setIdentificationHash(hash);
            person.setIdentificationHashVersion(version);
            person.setIdentificationVerificationStatus("LEGACY");
            personRepository.save(person);
            return true;
        } catch (DataIntegrityViolationException e) {
            // Unique constraint race — another record got the same hash.
            // Reset hash fields and flag instead.
            log.warn("Unique constraint violation during backfill for personId: {}. Flagging.", person.getId());
            // Must clear the failed state — the transaction will be rolled back.
            // The caller will call persistFlaggedPerson in a new transaction.
            return false;
        }
    }

    /**
     * Sets FLAGGED status on a person without modifying hash fields.
     *
     * @param person the person to flag
     * @param reason a short reason code (logged, not persisted)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persistFlaggedPerson(Person person, String reason) {
        person.setIdentificationVerificationStatus("FLAGGED");
        personRepository.save(person);
        log.info("Backfill flagged personId: {} reason: {}", person.getId(), reason);
    }
}
