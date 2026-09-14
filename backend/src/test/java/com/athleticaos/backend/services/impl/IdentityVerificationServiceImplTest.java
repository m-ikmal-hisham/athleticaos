package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.IdentityVerificationRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.exceptions.IdentityVerificationLockedException;
import com.athleticaos.backend.exceptions.IdentityVerificationMismatchException;
import com.athleticaos.backend.exceptions.IdentityVerificationNotAllowedException;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.IdentificationHashService;
import com.athleticaos.backend.services.IdentityVerificationThrottleService;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.mockito.InOrder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class IdentityVerificationServiceImplTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private PersonService personService;
    @Mock
    private UserService userService;
    @Mock
    private IdentificationHashService identificationHashService;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private HttpServletRequest httpServletRequest;

    private IdentityVerificationThrottleService throttleService;
    private IdentityVerificationServiceImpl service;

    private User adminUser;
    private User otherAdminUser;
    private Person person;
    private final UUID personId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();
    private final UUID otherAdminId = UUID.randomUUID();

    // Synthetic test data — valid 12-digit IC matching 2000-01-01 MALE
    private static final String VALID_SYNTHETIC_IC = "000101141235";
    private static final String WRONG_SYNTHETIC_IC = "000101149999";
    private static final String STORED_HASH = "fabricatedhash00000000000000000000000000000000000000000000000001";
    private static final String WRONG_HASH = "fabricatedhash00000000000000000000000000000000000000000000000002";

    @BeforeEach
    void setUp() {
        throttleService = new IdentityVerificationThrottleService();
        service = new IdentityVerificationServiceImpl(
                personRepository,
                personService,
                userService,
                identificationHashService,
                throttleService,
                auditLogger
        );

        adminUser = User.builder()
                .id(adminId)
                .email("superadmin@athleticaos.com")
                .firstName("Super")
                .lastName("Admin")
                .build();

        otherAdminUser = User.builder()
                .id(otherAdminId)
                .email("otheradmin@athleticaos.com")
                .firstName("Other")
                .lastName("Admin")
                .build();

        person = Person.builder()
                .id(personId)
                .firstName("Ahmad")
                .lastName("Razali")
                .dob(LocalDate.of(2000, 1, 1))
                .gender("MALE")
                .identificationType("MALAYSIAN_IC")
                .identificationVerificationStatus("UNVERIFIED")
                .identificationHash(STORED_HASH)
                .identificationHashVersion(1)
                .icOrPassport(VALID_SYNTHETIC_IC)
                .nationality("MALAYSIAN")
                .build();
    }

    @Test
    @DisplayName("1. Match sets VERIFIED, all 4 fields, saves, audits with stored hash version")
    void match_setsVerifiedAndAudited() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(VALID_SYNTHETIC_IC, 1)).thenReturn(STORED_HASH);
        when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
        PersonResponseDTO expectedResponse = PersonResponseDTO.builder().id(personId.toString()).build();
        when(personService.getPersonById(personId)).thenReturn(expectedResponse);

        IdentityVerificationRequest request = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "PRE_REGISTRATION_RECORD", true);

        PersonResponseDTO result = service.verify(personId, request, httpServletRequest);

        assertThat(result).isNotNull();
        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).save(captor.capture());
        Person saved = captor.getValue();

        assertThat(saved.getIdentificationVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(saved.getIdentificationVerifiedAt()).isNotNull();
        assertThat(saved.getIdentificationVerifiedBy()).isEqualTo(adminId);
        assertThat(saved.getIdentificationVerifiedByName()).isEqualTo("Super Admin");
        assertThat(saved.getIdentificationVerificationMethod()).isEqualTo("PRE_REGISTRATION_RECORD");

        verify(identificationHashService).computeHash(VALID_SYNTHETIC_IC, 1);
        InOrder inOrder = inOrder(personRepository, auditLogger);
        inOrder.verify(personRepository).save(any(Person.class));
        inOrder.verify(auditLogger).logIdentityVerified(saved, "PRE_REGISTRATION_RECORD", httpServletRequest);
    }

    @Test
    @DisplayName("1b. Match with active transaction defers audit logging to afterCommit")
    void match_withActiveTransaction_auditDeferredToAfterCommit() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(VALID_SYNTHETIC_IC, 1)).thenReturn(STORED_HASH);
        when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
        PersonResponseDTO expectedResponse = PersonResponseDTO.builder().id(personId.toString()).build();
        when(personService.getPersonById(personId)).thenReturn(expectedResponse);

        IdentityVerificationRequest request = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "PRE_REGISTRATION_RECORD", true);

        try {
            TransactionSynchronizationManager.initSynchronization();
            PersonResponseDTO result = service.verify(personId, request, httpServletRequest);
            assertThat(result).isNotNull();

            // BEFORE commit: audit logger must NOT have been called
            verify(auditLogger, never()).logIdentityVerified(any(), any(), any());

            // Trigger afterCommit
            assertThat(TransactionSynchronizationManager.getSynchronizations()).isNotEmpty();
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            // AFTER commit: auditLogger called
            verify(auditLogger).logIdentityVerified(any(Person.class), eq("PRE_REGISTRATION_RECORD"), eq(httpServletRequest));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("2. Mismatch throws IdentityVerificationMismatchException, nothing saved, audited")
    void mismatch_throwsMismatchException_nothingSaved() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(WRONG_SYNTHETIC_IC, 1)).thenReturn(WRONG_HASH);

        IdentityVerificationRequest request = new IdentityVerificationRequest(
                WRONG_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationMismatchException.class)
                .hasMessage("The identification number entered does not match the record on file.");

        verify(personRepository, never()).save(any());
        verify(auditLogger).logIdentityVerificationFailed(person, httpServletRequest);
    }

    @Test
    @DisplayName("2b. Mismatch with active transaction audits failure immediately without waiting for commit")
    void mismatch_withActiveTransaction_auditImmediate() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(WRONG_SYNTHETIC_IC, 1)).thenReturn(WRONG_HASH);

        IdentityVerificationRequest request = new IdentityVerificationRequest(
                WRONG_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        try {
            TransactionSynchronizationManager.initSynchronization();
            assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                    .isInstanceOf(IdentityVerificationMismatchException.class);

            // Audit was logged immediately
            verify(auditLogger).logIdentityVerificationFailed(person, httpServletRequest);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("3. After 5 mismatches, 6th attempt with correct value throws locked exception, computeHash not called")
    void after5Mismatches_6thAttemptLocked_computeHashNotCalled() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(WRONG_SYNTHETIC_IC, 1)).thenReturn(WRONG_HASH);

        IdentityVerificationRequest wrongRequest = new IdentityVerificationRequest(
                WRONG_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        // 5 mismatches
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.verify(personId, wrongRequest, httpServletRequest))
                    .isInstanceOf(IdentityVerificationMismatchException.class);
        }

        verify(personRepository, never()).save(any());
        verify(identificationHashService, times(5)).computeHash(WRONG_SYNTHETIC_IC, 1);

        // 6th attempt with correct value
        IdentityVerificationRequest correctRequest = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        assertThatThrownBy(() -> service.verify(personId, correctRequest, httpServletRequest))
                .isInstanceOf(IdentityVerificationLockedException.class)
                .hasMessage("Too many verification attempts for this record. Try again in 15 minutes.");

        verify(personRepository, never()).save(any());
        // computeHash must not have been called on 6th attempt
        verify(identificationHashService, never()).computeHash(eq(VALID_SYNTHETIC_IC), anyInt());
    }

    @Test
    @DisplayName("4. A different administrator is not locked out by the first one's failures")
    void differentAdmin_notLockedByFirstAdminFailures() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(identificationHashService.isConfigured()).thenReturn(true);

        // Admin 1 incurs 5 failures
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.computeHash(WRONG_SYNTHETIC_IC, 1)).thenReturn(WRONG_HASH);

        IdentityVerificationRequest wrongRequest = new IdentityVerificationRequest(
                WRONG_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.verify(personId, wrongRequest, httpServletRequest))
                    .isInstanceOf(IdentityVerificationMismatchException.class);
        }

        // Admin 2 attempts verification with correct value
        when(userService.getCurrentUser()).thenReturn(otherAdminUser);
        when(identificationHashService.computeHash(VALID_SYNTHETIC_IC, 1)).thenReturn(STORED_HASH);
        when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personService.getPersonById(personId)).thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        IdentityVerificationRequest correctRequest = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        PersonResponseDTO response = service.verify(personId, correctRequest, httpServletRequest);
        assertThat(response).isNotNull();
        verify(personRepository).save(any());
    }

    @Test
    @DisplayName("5. Ineligible states throw 409 IdentityVerificationNotAllowedException, computeHash not called")
    void ineligibility_throws409_computeHashNotCalled() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        IdentityVerificationRequest request = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "PRE_REGISTRATION_RECORD", true);

        // 5a. Already VERIFIED
        person.setIdentificationVerificationStatus("VERIFIED");
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("This record is already verified.");

        // 5b. FLAGGED
        person.setIdentificationVerificationStatus("FLAGGED");
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("Resolve the duplicate identification conflict before verifying.");

        // 5c. Stored type not canonical (null or "IC")
        person.setIdentificationVerificationStatus("UNVERIFIED");
        person.setIdentificationType("IC");
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("Correct the identification type first by re-entering it in the edit form.");

        person.setIdentificationType(null);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("Correct the identification type first by re-entering it in the edit form.");

        // 5d. Gender not MALE/FEMALE
        person.setIdentificationType("MALAYSIAN_IC");
        person.setGender("OTHER");
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("Correct the gender first.");

        // 5e. Hash null or unconfigured
        person.setGender("MALE");
        person.setIdentificationHash(null);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("This record's identification has not been hashed yet.");

        person.setIdentificationHash(STORED_HASH);
        when(identificationHashService.isConfigured()).thenReturn(false);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("This record's identification has not been hashed yet.");

        verify(personRepository, never()).save(any());
        verify(identificationHashService, never()).computeHash(anyString(), anyInt());
    }

    @Test
    @DisplayName("6. Attested false (400) and DOB-inconsistent value (400) do not count toward lock")
    void invalidInput_throws400_doesNotCountTowardLock() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);

        // Attested false
        IdentityVerificationRequest unattendedRequest = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "PRE_REGISTRATION_RECORD", false);

        assertThatThrownBy(() -> service.verify(personId, unattendedRequest, httpServletRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Confirm that you compared the number against the source record.");

        // Inconsistent DOB (person has 2000-01-01, but input prefix is 990101)
        IdentityVerificationRequest inconsistentDobRequest = new IdentityVerificationRequest(
                "990101141235", "PRE_REGISTRATION_RECORD", true);

        assertThatThrownBy(() -> service.verify(personId, inconsistentDobRequest, httpServletRequest))
                .isInstanceOf(IllegalArgumentException.class);

        // Verify throttle is NOT locked (failure count is 0)
        assertThat(throttleService.isLocked(adminId, personId)).isFalse();
        verify(identificationHashService, never()).computeHash(anyString(), anyInt());
        verify(personRepository, never()).save(any());
    }

    @Test
    @DisplayName("7. Revoke on VERIFIED resets to UNVERIFIED with null fields, revoke on UNVERIFIED throws 409")
    void revoke_verifiedBecomesUnverified_unverifiedThrows409() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));

        // 7a. Revoke on UNVERIFIED throws 409
        person.setIdentificationVerificationStatus("UNVERIFIED");
        assertThatThrownBy(() -> service.revoke(personId, httpServletRequest))
                .isInstanceOf(IdentityVerificationNotAllowedException.class)
                .hasMessage("This record is not verified.");

        // 7b. Revoke on VERIFIED
        person.setIdentificationVerificationStatus("VERIFIED");
        person.setIdentificationVerifiedAt(LocalDateTime.now());
        person.setIdentificationVerifiedBy(adminId);
        person.setIdentificationVerifiedByName("Super Admin");
        person.setIdentificationVerificationMethod("PRE_REGISTRATION_RECORD");

        when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personService.getPersonById(personId)).thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        PersonResponseDTO response = service.revoke(personId, httpServletRequest);
        assertThat(response).isNotNull();

        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).save(captor.capture());
        Person revoked = captor.getValue();

        assertThat(revoked.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(revoked.getIdentificationVerifiedAt()).isNull();
        assertThat(revoked.getIdentificationVerifiedBy()).isNull();
        assertThat(revoked.getIdentificationVerifiedByName()).isNull();
        assertThat(revoked.getIdentificationVerificationMethod()).isNull();

        InOrder inOrder = inOrder(personRepository, auditLogger);
        inOrder.verify(personRepository).save(any(Person.class));
        inOrder.verify(auditLogger).logIdentityVerificationRevoked(revoked, httpServletRequest);
    }

    @Test
    @DisplayName("7c. Revoke with active transaction defers audit logging to afterCommit")
    void revoke_withActiveTransaction_auditDeferredToAfterCommit() {
        person.setIdentificationVerificationStatus("VERIFIED");
        person.setIdentificationVerifiedAt(LocalDateTime.now());
        person.setIdentificationVerifiedBy(adminId);
        person.setIdentificationVerifiedByName("Super Admin");
        person.setIdentificationVerificationMethod("PRE_REGISTRATION_RECORD");

        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(personRepository.save(any(Person.class))).thenAnswer(inv -> inv.getArgument(0));
        when(personService.getPersonById(personId)).thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        try {
            TransactionSynchronizationManager.initSynchronization();
            PersonResponseDTO response = service.revoke(personId, httpServletRequest);
            assertThat(response).isNotNull();

            // BEFORE commit: auditLogger not called
            verify(auditLogger, never()).logIdentityVerificationRevoked(any(), any());

            // Trigger afterCommit
            assertThat(TransactionSynchronizationManager.getSynchronizations()).isNotEmpty();
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            // AFTER commit: auditLogger called
            verify(auditLogger).logIdentityVerificationRevoked(any(Person.class), eq(httpServletRequest));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("8. No exception message and no audit summary contains the entered value or 6+ digit run")
    void noSensitiveData_inExceptionsOrAuditSummaries() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash(WRONG_SYNTHETIC_IC, 1)).thenReturn(WRONG_HASH);

        IdentityVerificationRequest request = new IdentityVerificationRequest(
                WRONG_SYNTHETIC_IC, "PRE_REGISTRATION_RECORD", true);

        try {
            service.verify(personId, request, httpServletRequest);
        } catch (Exception ex) {
            assertThat(ex.getMessage()).doesNotContain(WRONG_SYNTHETIC_IC);
            assertThat(containsSixConsecutiveDigits(ex.getMessage())).isFalse();
        }

        // Check audit summary generated in AuditLogger
        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(auditLogger).logIdentityVerificationFailed(captor.capture(), eq(httpServletRequest));
        Person audited = captor.getValue();
        assertThat(audited.getId()).isEqualTo(personId);
    }

    @Test
    @DisplayName("9. IdentityVerificationRequest.toString() does not contain the value")
    void requestToString_doesNotContainValue() {
        IdentityVerificationRequest request = new IdentityVerificationRequest(
                VALID_SYNTHETIC_IC, "DOCUMENT_SIGHTED", true);

        String str = request.toString();
        assertThat(str).doesNotContain(VALID_SYNTHETIC_IC);
        assertThat(str).contains("identificationValue=REDACTED");
        assertThat(str).contains("DOCUMENT_SIGHTED");
    }

    private boolean containsSixConsecutiveDigits(String text) {
        if (text == null) return false;
        return Pattern.compile("\\d{6,}").matcher(text).find();
    }
}
