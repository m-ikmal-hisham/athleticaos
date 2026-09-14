package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.IdentityVerificationRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.IdentificationType;
import com.athleticaos.backend.enums.IdentityVerificationMethod;
import com.athleticaos.backend.exceptions.IdentityVerificationLockedException;
import com.athleticaos.backend.exceptions.IdentityVerificationMismatchException;
import com.athleticaos.backend.exceptions.IdentityVerificationNotAllowedException;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.IdentificationHashService;
import com.athleticaos.backend.services.IdentityVerificationService;
import com.athleticaos.backend.services.IdentityVerificationThrottleService;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.utils.IdentificationUtil;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class IdentityVerificationServiceImpl implements IdentityVerificationService {

    private final PersonRepository personRepository;
    private final PersonService personService;
    private final UserService userService;
    private final IdentificationHashService identificationHashService;
    private final IdentityVerificationThrottleService throttleService;
    private final AuditLogger auditLogger;

    @Override
    @Transactional
    public PersonResponseDTO verify(UUID personId, IdentityVerificationRequest request, HttpServletRequest http) {
        // 1. Load person or 404
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        // 2. Eligibility checks
        if ("VERIFIED".equals(person.getIdentificationVerificationStatus())) {
            throw new IdentityVerificationNotAllowedException("This record is already verified.");
        }
        if ("FLAGGED".equals(person.getIdentificationVerificationStatus())) {
            throw new IdentityVerificationNotAllowedException("Resolve the duplicate identification conflict before verifying.");
        }
        if (!IdentificationType.isValid(person.getIdentificationType())) {
            throw new IdentityVerificationNotAllowedException("Correct the identification type first by re-entering it in the edit form.");
        }
        String gender = person.getGender();
        if (gender == null || (!gender.equals("MALE") && !gender.equals("FEMALE"))) {
            throw new IdentityVerificationNotAllowedException("Correct the gender first.");
        }
        if (person.getIdentificationHash() == null || person.getIdentificationHashVersion() == null
                || !identificationHashService.isConfigured()) {
            throw new IdentityVerificationNotAllowedException("This record's identification has not been hashed yet.");
        }

        // 3. Throttle check (before any hashing/comparison)
        User currentUser = userService.getCurrentUser();
        if (throttleService.isLocked(currentUser.getId(), person.getId())) {
            throw new IdentityVerificationLockedException("Too many verification attempts for this record. Try again in 15 minutes.");
        }

        // 4. Request validation
        IdentityVerificationMethod method = IdentityVerificationMethod.from(request.method());
        if (!Boolean.TRUE.equals(request.attested())) {
            throw new IllegalArgumentException("Confirm that you compared the number against the source record.");
        }
        String normalized = IdentificationUtil.validateAndNormalizeNewSubmission(
                request.identificationValue(), person.getIdentificationType(), person.getDob(), person.getGender());
        if (normalized == null) {
            throw new IllegalArgumentException("Identification number is required.");
        }

        // 5. Compare against stored hash only (never stored plaintext)
        String candidateHash = identificationHashService.computeHash(normalized, person.getIdentificationHashVersion());
        boolean matches = candidateHash != null
                && MessageDigest.isEqual(
                        candidateHash.getBytes(StandardCharsets.UTF_8),
                        person.getIdentificationHash().getBytes(StandardCharsets.UTF_8));

        // 6. Mismatch
        if (!matches) {
            throttleService.recordFailure(currentUser.getId(), person.getId());
            auditLogger.logIdentityVerificationFailed(person, http);
            throw new IdentityVerificationMismatchException();
        }

        // 7. Match
        throttleService.recordSuccess(currentUser.getId(), person.getId());
        person.setIdentificationVerificationStatus("VERIFIED");
        person.setIdentificationVerifiedAt(LocalDateTime.now());
        person.setIdentificationVerifiedBy(currentUser.getId());

        String fullName = ((currentUser.getFirstName() != null ? currentUser.getFirstName() : "") + " "
                + (currentUser.getLastName() != null ? currentUser.getLastName() : "")).trim();
        String verifiedByName = !fullName.isEmpty() ? fullName : currentUser.getEmail();
        person.setIdentificationVerifiedByName(verifiedByName);
        person.setIdentificationVerificationMethod(method.name());

        person = personRepository.save(person);
        auditLogger.logIdentityVerified(person, method.name(), http);

        return personService.getPersonById(person.getId());
    }

    @Override
    @Transactional
    public PersonResponseDTO revoke(UUID personId, HttpServletRequest http) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));

        if (!"VERIFIED".equals(person.getIdentificationVerificationStatus())) {
            throw new IdentityVerificationNotAllowedException("This record is not verified.");
        }

        person.clearIdentityVerification("UNVERIFIED");
        person = personRepository.save(person);
        auditLogger.logIdentityVerificationRevoked(person, http);

        return personService.getPersonById(person.getId());
    }
}
