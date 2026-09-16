package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.person.CreatePersonRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.PersonUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.repositories.OfficialRegistryRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamStaffRepository;
import com.athleticaos.backend.repositories.TournamentOfficialRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.repositories.TournamentStaffRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.exceptions.EmailRequiredException;
import com.athleticaos.backend.exceptions.PossibleDuplicatePersonException;
import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.dtos.person.PossibleDuplicateMatch;
import com.athleticaos.backend.services.PersonDuplicateService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PersonServiceImplTest {

    @Mock
    private PersonRepository personRepository;
    @Mock
    private ObjectProvider<HttpServletRequest> requestProvider;
    @Mock
    private OrganisationPersonRepository organisationPersonRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private TeamStaffRepository teamStaffRepository;
    @Mock
    private OfficialRegistryRepository officialRegistryRepository;
    @Mock
    private TournamentPlayerRepository tournamentPlayerRepository;
    @Mock
    private TournamentStaffRepository tournamentStaffRepository;
    @Mock
    private TournamentOfficialRepository tournamentOfficialRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private OrganisationRepository organisationRepository;
    @Mock
    private OrganisationService organisationService;
    @Mock
    private UserService userService;
    @Mock
    private com.athleticaos.backend.audit.AuditLogger auditLogger;
    @Mock
    private PersonDuplicateService personDuplicateService;

    @InjectMocks
    private PersonServiceImpl personService;

    private UUID organisationId;
    private UUID personId;
    private Organisation organisation;
    private Person existingPerson;

    @BeforeEach
    void setUp() {
        organisationId = UUID.randomUUID();
        personId = UUID.randomUUID();

        organisation = Organisation.builder()
                .id(organisationId)
                .name("Test Org")
                .build();

        existingPerson = Person.builder()
                .id(personId)
                .firstName("Ahmad")
                .lastName("Ibrahim")
                .gender("MALE")
                .dob(LocalDate.of(1990, 1, 1))
                .recordVerificationStatus("UNVERIFIED")
                .email("ahmad.ibrahim@example.invalid")
                .build();
    }

    @Test
    void createPerson_validInput_succeeds() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Siti");
        request.setLastName("Nur");
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setGender("FEMALE");
        request.setEmail("siti.nur@example.invalid");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        UUID newPersonId = UUID.randomUUID();
        Person savedPerson = Person.builder()
                .id(newPersonId)
                .firstName("Siti")
                .lastName("Nur")
                .dob(LocalDate.of(1992, 2, 2))
                .gender("FEMALE")
                .email("siti.nur@example.invalid")
                .recordVerificationStatus("UNVERIFIED")
                .build();

        when(personRepository.saveAndFlush(any(Person.class))).thenReturn(savedPerson);
        when(personRepository.findById(newPersonId)).thenReturn(Optional.of(savedPerson));

        PersonResponseDTO response = personService.createPerson(organisationId, request);

        assertThat(response).isNotNull();
        assertThat(response.getRecordVerification().status()).isEqualTo("UNVERIFIED");
        verify(personRepository).saveAndFlush(any(Person.class));
    }

    @Test
    void updatePerson_invalidGenderOther_throwsIllegalArgument() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("OTHER");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Gender must be MALE or FEMALE.");

        verify(personRepository, never()).save(any(Person.class));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
    }

    @Test
    void updatePerson_verified_dobChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1995, 5, 5));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        assertThat(existingPerson.getRecordVerifiedBy()).isNull();
        assertThat(existingPerson.getRecordVerifiedByName()).isNull();
        assertThat(existingPerson.getRecordVerificationMethod()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_firstNameChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setFirstName("DifferentName");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_lastNameChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setLastName("DifferentLastName");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_genderChanged_clearsRecordVerificationAndAuditsReset() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        existingPerson.setRecordVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setRecordVerifiedBy(UUID.randomUUID());
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("FEMALE");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isNull();
        verify(auditLogger).logRecordVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_phoneOnlyChange_resendingSameDobAndGender_staysVerified() {
        existingPerson.setRecordVerificationStatus("VERIFIED");
        java.time.LocalDateTime verifiedAt = java.time.LocalDateTime.now();
        UUID adminId = UUID.randomUUID();
        existingPerson.setRecordVerifiedAt(verifiedAt);
        existingPerson.setRecordVerifiedBy(adminId);
        existingPerson.setRecordVerifiedByName("Admin User");
        existingPerson.setRecordVerificationMethod("PRE_REGISTRATION_RECORD");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(existingPerson.getDob());
        request.setGender(existingPerson.getGender());
        request.setPhone("+60123456789");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getRecordVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(existingPerson.getRecordVerifiedAt()).isEqualTo(verifiedAt);
        assertThat(existingPerson.getRecordVerifiedBy()).isEqualTo(adminId);
        assertThat(existingPerson.getRecordVerifiedByName()).isEqualTo("Admin User");
        assertThat(existingPerson.getRecordVerificationMethod()).isEqualTo("PRE_REGISTRATION_RECORD");
        verify(auditLogger, never()).logRecordVerificationReset(any(), any());
    }

    // -----------------------------------------------------------------------
    // DEF-R01: Email normalisation & duplicate handling
    // -----------------------------------------------------------------------

    @Test
    void createPerson_blankEmail_throwsEmailRequiredException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("   ");
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("Email is required.");
    }

    @Test
    void createPerson_nullEmail_throwsEmailRequiredException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail(null);
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("Email is required.");
    }

    @Test
    void createPerson_duplicateEmail_throwsDuplicateEmailException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("taken@example.com");
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCase("taken@example.com");
    }

    @Test
    void createPerson_duplicateEmailIgnoreCase_storedMixedCaseBlocksNewSubmission() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("case@example.test");
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmailIgnoreCase("case@example.test")).thenReturn(true);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCase("case@example.test");
    }

    @Test
    void updatePerson_blankEmail_throwsEmailRequiredException() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("   ");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("Email is required.");
    }

    @Test
    void updatePerson_legacyPersonWithoutEmail_noEmailInRequest_throwsEmailRequiredException() {
        existingPerson.setEmail(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setPhone("0123456789");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(EmailRequiredException.class)
                .hasMessage("This person has no email address. Add one to save changes.");
    }

    @Test
    void updatePerson_legacyPersonWithoutEmail_providingEmail_succeeds() {
        existingPerson.setEmail(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("new.added@example.invalid");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isEqualTo("new.added@example.invalid");
    }

    @Test
    void updatePerson_nullEmail_leavesEmailUnchanged() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail(null);

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isEqualTo("existing@example.com");
    }

    @Test
    void updatePerson_duplicateEmail_throwsDuplicateEmailException() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByEmailIgnoreCaseAndIdNot("other@example.com", personId)).thenReturn(true);

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("other@example.com");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCaseAndIdNot("other@example.com", personId);
    }

    @Test
    void updatePerson_duplicateEmailIgnoreCase_storedMixedCaseBlocksUpdate() {
        existingPerson.setEmail("myemail@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByEmailIgnoreCaseAndIdNot("case@example.test", personId)).thenReturn(true);

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("case@example.test");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCaseAndIdNot("case@example.test", personId);
    }

    @Test
    void updatePerson_sameEmail_succeeds() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByEmailIgnoreCaseAndIdNot("existing@example.com", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail(" existing@example.com ");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isEqualTo("existing@example.com");
        verify(personRepository).existsByEmailIgnoreCaseAndIdNot("existing@example.com", personId);
    }

    @Test
    void createPerson_withPossibleDuplicateMatch_noFlag_throwsPossibleDuplicatePersonException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Ali");
        request.setLastName("Abu");
        request.setEmail("ali.abu@example.invalid");
        request.setGender("MALE");
        request.setDob(LocalDate.of(2000, 1, 1));
        request.setNationality("MALAYSIAN");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmailIgnoreCase("ali.abu@example.invalid")).thenReturn(false);

        PossibleDuplicateCheck dupCheck = new PossibleDuplicateCheck(
                List.of(new PossibleDuplicateMatch("AOS-000001", "Ali", "Abu")), 0);
        when(personDuplicateService.check("Ali", "Abu", LocalDate.of(2000, 1, 1), "MALE", null))
                .thenReturn(dupCheck);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(PossibleDuplicatePersonException.class);
        verify(personRepository, never()).save(any(Person.class));
        verify(personRepository, never()).saveAndFlush(any(Person.class));
    }

    @Test
    void createPerson_withPossibleDuplicateMatch_confirmFlagTrue_savesPersonAndAudits() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Ali");
        request.setLastName("Abu");
        request.setEmail("ali.abu@example.invalid");
        request.setGender("MALE");
        request.setDob(LocalDate.of(2000, 1, 1));
        request.setNationality("MALAYSIAN");
        request.setConfirmPossibleDuplicate(true);

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmailIgnoreCase("ali.abu@example.invalid")).thenReturn(false);
        Person savedPerson = Person.builder()
                .id(personId)
                .firstName("Ali")
                .lastName("Abu")
                .email("ali.abu@example.invalid")
                .gender("MALE")
                .dob(LocalDate.of(2000, 1, 1))
                .nationality("MALAYSIAN")
                .build();
        when(personRepository.saveAndFlush(any(Person.class))).thenReturn(savedPerson);
        when(personRepository.findById(personId)).thenReturn(Optional.of(savedPerson));

        PossibleDuplicateCheck dupCheck = new PossibleDuplicateCheck(
                List.of(new PossibleDuplicateMatch("AOS-000001", "Ali", "Abu")), 0);
        when(personDuplicateService.check("Ali", "Abu", LocalDate.of(2000, 1, 1), "MALE", null))
                .thenReturn(dupCheck);

        PersonResponseDTO response = personService.createPerson(organisationId, request);

        assertThat(response).isNotNull();
        verify(personRepository).saveAndFlush(any(Person.class));
        verify(auditLogger).logPersonPossibleDuplicateOverride(any(Person.class), eq(1), eq(0), any());
    }
}
