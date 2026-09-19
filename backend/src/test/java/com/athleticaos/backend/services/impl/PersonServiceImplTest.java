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
import com.athleticaos.backend.services.AccessScopeService;
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
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
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
    @Mock
    private AccessScopeService accessScopeService;

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
                .firstName("Person")
                .lastName("Synthetic B")
                .gender("MALE")
                .dob(LocalDate.of(1990, 1, 1))
                .recordVerificationStatus("UNVERIFIED")
                .email("person.synthetic.b@example.test")
                .build();

        lenient().when(accessScopeService.isOrganisationInScope(any())).thenReturn(true);
        lenient().when(accessScopeService.isPersonInScope(any())).thenReturn(true);
        lenient().when(accessScopeService.isUserInScope(any())).thenReturn(true);
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
                .hasMessage("An existing email address cannot be removed.");
    }

    @Test
    void updatePerson_legacyPersonWithoutEmail_noEmailInRequest_succeeds() {
        existingPerson.setEmail(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setPhone("0123456789");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getPhone()).isEqualTo("0123456789");
        assertThat(existingPerson.getEmail()).isNull();
    }

    @Test
    void updatePerson_legacyPersonWithoutEmail_blankEmailInRequest_succeeds() {
        existingPerson.setEmail(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("   ");
        request.setPhone("0123456789");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isNull();
    }

    @Test
    void updatePerson_placeholderEmail_canBeCleared() {
        existingPerson.setEmail("aos-000123@placeholder.invalid");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isNull();
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

    // R5: getPersonByIdInScope
    @Test
    void getPersonByIdInScope_whenInScope_returnsResponse() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(true);

        PersonResponseDTO response = personService.getPersonByIdInScope(personId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(personId.toString());
        assertThat(response.getEmail()).isEqualTo("person.synthetic.b@example.test");
    }

    @Test
    void getPersonByIdInScope_whenOutOfScope_throws404ExactMessage() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> personService.getPersonByIdInScope(personId))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Person not found");
    }

    @Test
    void getPersonByIdInScope_whenMissing_throws404ExactMessage() {
        when(personRepository.findById(personId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> personService.getPersonByIdInScope(personId))
                .isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
                .hasMessage("Person not found");
    }

    @Test
    void getPersonByIdInScope_whenSuperAdmin_returnsResponse() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(true);

        PersonResponseDTO response = personService.getPersonByIdInScope(personId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(personId.toString());
    }

    // R6: getUnlinkedUsersInScope
    @Test
    void getUnlinkedUsersInScope_whenInScope_returnsUsers() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(true);
        com.athleticaos.backend.entities.User user = com.athleticaos.backend.entities.User.builder()
                .id(UUID.randomUUID())
                .firstName("User")
                .lastName("A")
                .email("user.a@example.test")
                .build();
        when(userRepository.findByOrganisationId(organisationId)).thenReturn(List.of(user));
        when(personRepository.findAll()).thenReturn(List.of());

        var users = personService.getUnlinkedUsersInScope(organisationId);

        assertThat(users).hasSize(1);
        assertThat(users.get(0).getEmail()).isEqualTo("user.a@example.test");
    }

    @Test
    void getUnlinkedUsersInScope_whenOutOfScope_returnsEmptyList() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        var users = personService.getUnlinkedUsersInScope(organisationId);

        assertThat(users).isEmpty();
        verify(userRepository, never()).findByOrganisationId(any());
    }

    @Test
    void getUnlinkedUsersInScope_whenSuperAdmin_returnsUsers() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(true);
        when(userRepository.findByOrganisationId(organisationId)).thenReturn(List.of());
        when(personRepository.findAll()).thenReturn(List.of());

        var users = personService.getUnlinkedUsersInScope(organisationId);

        assertThat(users).isNotNull();
    }

    // W1: updatePerson scope tests
    @Test
    void updatePerson_whenOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.person.PersonUpdateRequest request = new com.athleticaos.backend.dtos.person.PersonUpdateRequest();
        request.setFirstName("Updated");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Person not found");

        verify(personRepository, never()).save(any());
        verify(personDuplicateService, never()).check(any(), any(), any(), any(), any());
    }

    // W1: deletePerson scope tests
    @Test
    void deletePerson_whenOutOfScope_throwsNotFoundWithExactMessageAndNeverDeletes() {
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> personService.deletePerson(personId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Person not found");

        verify(personRepository, never()).delete(any());
        verify(organisationPersonRepository, never()).deleteAll(any());
    }

    // W2: linkToUser scope tests
    @Test
    void linkToUser_whenPersonOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        UUID userId = UUID.randomUUID();
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> personService.linkToUser(personId, userId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Person not found");

        verify(userRepository, never()).findById(any());
        verify(personRepository, never()).save(any());
    }

    @Test
    void linkToUser_whenUserOutOfScope_throwsNotFoundWithExactMessageAndNeverSaves() {
        UUID userId = UUID.randomUUID();
        com.athleticaos.backend.entities.User user = com.athleticaos.backend.entities.User.builder()
                .id(userId)
                .build();

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(accessScopeService.isPersonInScope(personId)).thenReturn(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(accessScopeService.isUserInScope(user)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> personService.linkToUser(personId, userId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("User not found");

        verify(personRepository, never()).save(any());
    }

    // W3: createPerson scope tests
    @Test
    void createPerson_whenOrganisationOutOfScope_throwsNotFoundWithExactMessageAndNeverChecksDuplicates() {
        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        com.athleticaos.backend.dtos.person.CreatePersonRequest request = new com.athleticaos.backend.dtos.person.CreatePersonRequest();
        request.setFirstName("Person");
        request.setLastName("Synthetic A");
        request.setGender("MALE");
        request.setDob(LocalDate.of(1993, 3, 3));
        request.setEmail("person.synthetic.a@example.test");

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Organisation not found");

        verify(personDuplicateService, never()).check(any(), any(), any(), any(), any());
        verify(personRepository, never()).saveAndFlush(any());
    }
}
