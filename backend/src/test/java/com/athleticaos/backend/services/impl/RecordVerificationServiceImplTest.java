package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.RecordVerificationRequest;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.exceptions.RecordVerificationNotAllowedException;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class RecordVerificationServiceImplTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private PersonService personService;
    @Mock
    private UserService userService;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private HttpServletRequest httpServletRequest;

    private RecordVerificationServiceImpl service;

    private User adminUser;
    private Person person;
    private final UUID personId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RecordVerificationServiceImpl(
                personRepository,
                personService,
                userService,
                auditLogger
        );

        adminUser = User.builder()
                .id(adminId)
                .email("superadmin@athleticaos.com")
                .firstName("Super")
                .lastName("Admin")
                .build();

        person = Person.builder()
                .id(personId)
                .firstName("Test")
                .lastName("Athlete")
                .gender("MALE")
                .dob(LocalDate.of(2000, 1, 1))
                .nationality("MALAYSIAN")
                .email("athlete@example.invalid")
                .recordVerificationStatus("UNVERIFIED")
                .build();
    }

    @Test
    @DisplayName("verify with valid method and attestation succeeds and sets verified fields")
    void verify_validRequest_succeeds() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(userService.getCurrentUser()).thenReturn(adminUser);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonResponseDTO mockResponse = PersonResponseDTO.builder()
                .id(personId.toString())
                .firstName("Test")
                .lastName("Athlete")
                .build();
        when(personService.getPersonById(personId)).thenReturn(mockResponse);

        RecordVerificationRequest request = new RecordVerificationRequest("PRE_REGISTRATION_RECORD", true);
        PersonResponseDTO result = service.verify(personId, request, httpServletRequest);

        assertThat(result).isNotNull();
        assertThat(person.getRecordVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(person.getRecordVerifiedAt()).isNotNull();
        assertThat(person.getRecordVerifiedBy()).isEqualTo(adminId);
        assertThat(person.getRecordVerifiedByName()).isEqualTo("Super Admin");
        assertThat(person.getRecordVerificationMethod()).isEqualTo("PRE_REGISTRATION_RECORD");

        verify(auditLogger).logRecordVerified(person, "PRE_REGISTRATION_RECORD", httpServletRequest);
    }

    @Test
    @DisplayName("verify throws when person is already verified")
    void verify_alreadyVerified_throwsNotAllowed() {
        person.setRecordVerificationStatus("VERIFIED");
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));

        RecordVerificationRequest request = new RecordVerificationRequest("DOCUMENT_SIGHTED", true);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(RecordVerificationNotAllowedException.class)
                .hasMessage("This record is already verified.");
    }

    @Test
    @DisplayName("verify throws when attestation is false or null")
    void verify_notAttested_throwsIllegalArgument() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));

        RecordVerificationRequest request = new RecordVerificationRequest("DOCUMENT_SIGHTED", false);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Confirm that you verified the record against the source.");
    }

    @Test
    @DisplayName("verify throws EntityNotFoundException when person not found")
    void verify_personNotFound_throws() {
        when(personRepository.findById(personId)).thenReturn(Optional.empty());

        RecordVerificationRequest request = new RecordVerificationRequest("DOCUMENT_SIGHTED", true);
        assertThatThrownBy(() -> service.verify(personId, request, httpServletRequest))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Person not found");
    }

    @Test
    @DisplayName("revoke clears attestation and sets status to UNVERIFIED")
    void revoke_verifiedPerson_succeeds() {
        person.setRecordVerificationStatus("VERIFIED");
        person.setRecordVerifiedAt(LocalDateTime.now());
        person.setRecordVerifiedBy(adminId);
        person.setRecordVerifiedByName("Super Admin");
        person.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(person));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonResponseDTO mockResponse = PersonResponseDTO.builder().id(personId.toString()).build();
        when(personService.getPersonById(personId)).thenReturn(mockResponse);

        PersonResponseDTO result = service.revoke(personId, httpServletRequest);

        assertThat(result).isNotNull();
        assertThat(person.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(person.getRecordVerifiedAt()).isNull();
        assertThat(person.getRecordVerifiedBy()).isNull();
        assertThat(person.getRecordVerifiedByName()).isNull();
        assertThat(person.getRecordVerificationMethod()).isNull();

        verify(auditLogger).logRecordVerificationRevoked(person, httpServletRequest);
    }

    @Test
    @DisplayName("revoke throws when person is not verified")
    void revoke_unverifiedPerson_throwsNotAllowed() {
        person.setRecordVerificationStatus("UNVERIFIED");
        when(personRepository.findById(personId)).thenReturn(Optional.of(person));

        assertThatThrownBy(() -> service.revoke(personId, httpServletRequest))
                .isInstanceOf(RecordVerificationNotAllowedException.class)
                .hasMessage("This record is not verified.");
    }
}
