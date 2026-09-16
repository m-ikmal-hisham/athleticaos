package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.RecordVerificationRequest;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.RecordVerificationMethod;
import com.athleticaos.backend.exceptions.RecordVerificationNotAllowedException;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.RecordVerificationService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class RecordVerificationServiceImpl implements RecordVerificationService {

    private final PersonRepository personRepository;
    private final PersonService personService;
    private final UserService userService;
    private final AuditLogger auditLogger;

    @Override
    @Transactional
    public PersonResponseDTO verify(UUID personId, RecordVerificationRequest request, HttpServletRequest http) {
        // 1. Load person or 404
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        // 2. Eligibility checks
        if ("VERIFIED".equals(person.getRecordVerificationStatus())) {
            throw new RecordVerificationNotAllowedException("This record is already verified.");
        }

        // 3. Request validation
        RecordVerificationMethod method = RecordVerificationMethod.from(request.method());
        if (!Boolean.TRUE.equals(request.attested())) {
            throw new IllegalArgumentException("Confirm that you verified the record against the source.");
        }

        // 4. Set verification attestation fields
        User currentUser = userService.getCurrentUser();
        person.setRecordVerificationStatus("VERIFIED");
        person.setRecordVerifiedAt(LocalDateTime.now());
        person.setRecordVerifiedBy(currentUser.getId());

        String fullName = ((currentUser.getFirstName() != null ? currentUser.getFirstName() : "") + " "
                + (currentUser.getLastName() != null ? currentUser.getLastName() : "")).trim();
        String verifiedByName = !fullName.isEmpty() ? fullName : currentUser.getEmail();
        person.setRecordVerifiedByName(verifiedByName);
        person.setRecordVerificationMethod(method.name());

        person = personRepository.save(person);
        final Person personForAudit = person;
        final String methodName = method.name();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    auditLogger.logRecordVerified(personForAudit, methodName, http);
                }
            });
        } else {
            auditLogger.logRecordVerified(personForAudit, methodName, http);
        }

        return personService.getPersonById(person.getId());
    }

    @Override
    @Transactional
    public PersonResponseDTO revoke(UUID personId, HttpServletRequest http) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        if (!"VERIFIED".equals(person.getRecordVerificationStatus())) {
            throw new RecordVerificationNotAllowedException("This record is not verified.");
        }

        person.clearRecordVerification("UNVERIFIED");
        person = personRepository.save(person);
        final Person personForAudit = person;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    auditLogger.logRecordVerificationRevoked(personForAudit, http);
                }
            });
        } else {
            auditLogger.logRecordVerificationRevoked(personForAudit, http);
        }

        return personService.getPersonById(person.getId());
    }
}
