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
import com.athleticaos.backend.services.IdentificationHashService;
import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.exceptions.DuplicateIcException;
import org.mockito.ArgumentCaptor;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
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
import static org.mockito.Mockito.inOrder;
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
    private IdentificationHashService identificationHashService;
    @Mock
    private OrganisationService organisationService;
    @Mock
    private UserService userService;
    @Mock
    private com.athleticaos.backend.audit.AuditLogger auditLogger;

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
                .icOrPassport("900101011235")
                .identificationType("MALAYSIAN_IC")
                .identificationHash("hash900101011235")
                .identificationHashVersion(1)
                .identificationVerificationStatus("UNVERIFIED")
                .build();
    }

    @Test
    void createPerson_validInput_setsIdentificationHashAndStatus() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Siti");
        request.setLastName("Nur");
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setGender("FEMALE");
        request.setIcOrPassport("920202-02-2346"); // even last digit for female
        request.setIdentificationType("MALAYSIAN_IC");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("920202022346")).thenReturn("hash920202022346");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHash("hash920202022346")).thenReturn(false);
        when(personRepository.existsByIcOrPassport("920202022346")).thenReturn(false);
        UUID newPersonId = UUID.randomUUID();
        Person savedPerson = Person.builder()
                .id(newPersonId)
                .firstName("Siti")
                .lastName("Nur")
                .dob(LocalDate.of(1992, 2, 2))
                .gender("FEMALE")
                .icOrPassport("920202022346")
                .identificationType("MALAYSIAN_IC")
                .identificationHash("hash920202022346")
                .identificationHashVersion(1)
                .identificationVerificationStatus("UNVERIFIED")
                .build();

        when(personRepository.save(any(Person.class))).thenReturn(savedPerson);
        when(personRepository.findById(newPersonId)).thenReturn(Optional.of(savedPerson));

        PersonResponseDTO response = personService.createPerson(organisationId, request);

        assertThat(response).isNotNull();
        assertThat(response.isIdentificationPresent()).isTrue();
        assertThat(response.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        verify(personRepository).save(any(Person.class));
    }

    @Test
    void createPerson_duplicateHash_throwsException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Siti");
        request.setLastName("Nur");
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setGender("FEMALE");
        request.setIcOrPassport("920202-02-2346");
        request.setIdentificationType("MALAYSIAN_IC");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("920202022346")).thenReturn("hash-existing");
        when(personRepository.existsByIdentificationHash("hash-existing")).thenReturn(true);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.DuplicateIcException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void updatePerson_nullIc_preservesExistingValues() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setFirstName("Ahmad Updated");
        request.setLastName("Ibrahim");
        request.setIcOrPassport(null); // null means leave unchanged

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonResponseDTO response = personService.updatePerson(personId, request);

        assertThat(response).isNotNull();
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011235");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hash900101011235");
    }

    @Test
    void updatePerson_newValidIc_computesNewHash() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setFirstName("Ahmad");
        request.setLastName("Ibrahim");
        request.setIcOrPassport("900101-01-5679"); // valid male
        request.setIdentificationType("MALAYSIAN_IC");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("900101015679")).thenReturn("hashNew900101015679");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashNew900101015679", personId)).thenReturn(false);
        when(personRepository.existsByIcOrPassportAndIdNot("900101015679", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101015679");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hashNew900101015679");
        assertThat(existingPerson.getIdentificationHashVersion()).isEqualTo(1);
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
    }

    @Test
    void updatePerson_unrelatedEdit_preservesAllIdentificationFields() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setFirstName("Ahmad Updated");
        request.setLastName("Ibrahim Updated");
        // No IC or identification changes in request

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getFirstName()).isEqualTo("Ahmad Updated");
        assertThat(existingPerson.getLastName()).isEqualTo("Ibrahim Updated");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011235");
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hash900101011235");
        assertThat(existingPerson.getIdentificationHashVersion()).isEqualTo(1);
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
    }

    @Test
    void createPerson_duplicateIc_throwsDuplicateIcException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("Ali");
        request.setLastName("Hassan");
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setGender("FEMALE");
        request.setIcOrPassport("920202-02-2346");
        request.setIdentificationType("MALAYSIAN_IC");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(identificationHashService.isConfigured()).thenReturn(false);
        when(personRepository.existsByIcOrPassport("920202022346")).thenReturn(true);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.DuplicateIcException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void updatePerson_duplicateIc_throwsDuplicateIcException() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setIcOrPassport("920202-02-2346");
        request.setIdentificationType("MALAYSIAN_IC");
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setGender("FEMALE");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(identificationHashService.isConfigured()).thenReturn(false);
        when(personRepository.existsByIcOrPassportAndIdNot("920202022346", personId)).thenReturn(true);

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.DuplicateIcException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void updatePerson_ownStoredIc_doesNotReportDuplicate() {
        // Re-submitting the person's own identity must succeed (not treated as duplicate)
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setIcOrPassport("900101-01-1235"); // same as existingPerson's IC after normalisation
        request.setIdentificationType("MALAYSIAN_IC");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(identificationHashService.isConfigured()).thenReturn(false);
        when(personRepository.existsByIcOrPassportAndIdNot("900101011235", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011235");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePerson_maskedValue_throwsAndNeverSaves() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setIcOrPassport("******9001");
        request.setIdentificationType("PASSPORT");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("masked");

        verify(personRepository, never()).save(any(Person.class));
    }

    // -----------------------------------------------------------------------
    // OBS-05B: DOB / gender reentry guard
    // -----------------------------------------------------------------------

    @Test
    void updatePerson_icHolder_dobChanged_noIc_throwsReentryRequired() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1991, 6, 6)); // different from stored 1990-01-01

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, never()).save(any(Person.class));
        // Entity fields must be unchanged
        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1990, 1, 1));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011235");
    }

    @Test
    void updatePerson_icHolder_genderChanged_noIc_throwsReentryRequired() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("FEMALE"); // different from stored MALE

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, never()).save(any(Person.class));
        assertThat(existingPerson.getGender()).isEqualTo("MALE");
    }

    @Test
    void updatePerson_icHolder_unchangedDobGender_changePhone_succeeds() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1990, 1, 1)); // same as stored
        request.setGender("MALE"); // same as stored
        request.setPhone("0123456789");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getPhone()).isEqualTo("0123456789");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011235");
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePerson_icHolder_dobChanged_validReenteredIc_succeeds() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1991, 6, 6)); // different from stored 1990-01-01
        request.setGender("MALE");
        request.setIcOrPassport("910606-14-5551"); // IC matching new DOB, MALE (odd last digit)
        request.setIdentificationType("MALAYSIAN_IC");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("910606145551")).thenReturn("hashNew910606");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashNew910606", personId)).thenReturn(false);
        when(personRepository.existsByIcOrPassportAndIdNot("910606145551", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("910606145551");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hashNew910606");
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePerson_icHolder_dobChanged_reenteredIcMatchesOldDob_throwsIllegalArgument() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1991, 6, 6)); // different from stored 1990-01-01
        request.setGender("MALE");
        request.setIcOrPassport("900101-01-1235"); // IC prefix matches OLD DOB, not new
        request.setIdentificationType("MALAYSIAN_IC");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Malaysian IC date prefix");

        verify(personRepository, never()).save(any(Person.class));
    }

    @Test
    void updatePerson_passportHolder_dobAndGenderChanged_noIc_succeeds() {
        existingPerson.setIdentificationType("PASSPORT");
        existingPerson.setIcOrPassport("A12345678");

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(2000, 1, 1)); // different from stored
        request.setGender("FEMALE"); // different from stored

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(2000, 1, 1));
        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("A12345678");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePerson_reentryException_messageContainsNoDigits() {
        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("FEMALE"); // different from stored MALE

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class)
                .satisfies(ex -> assertThat(ex.getMessage()).doesNotMatch(".*\\d.*"));
    }

    @Test
    void updatePerson_nullStoredType_dobChanged_noIdentity_throwsReentryRequired() {
        existingPerson.setIdentificationType(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1991, 6, 6)); // changed from 1990-01-01

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(com.athleticaos.backend.exceptions.IdentificationReentryRequiredException.class);

        verify(personRepository, never()).save(any(Person.class));
        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1990, 1, 1));
    }

    @Test
    void updatePerson_nonCanonicalStoredType_genderChanged_reenteredIc_succeedsWithCanonicalType() {
        existingPerson.setIdentificationType("IC");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("900101145552", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("900101145552")).thenReturn("hashFemale900101");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashFemale900101", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("FEMALE");
        request.setIcOrPassport("900101-14-5552");
        request.setIdentificationType("MALAYSIAN_IC");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getIdentificationType()).isEqualTo("MALAYSIAN_IC");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101145552");
        verify(personRepository).save(existingPerson);
    }

    @Test
    void updatePerson_nullStoredType_dobChanged_reenteredPassport_succeedsWithPassportType() {
        existingPerson.setIdentificationType(null);
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("A98765432", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("A98765432")).thenReturn("hashPassport");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("hashPassport", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1992, 2, 2));
        request.setIcOrPassport("A98765432");
        request.setIdentificationType("PASSPORT");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getDob()).isEqualTo(LocalDate.of(1992, 2, 2));
        assertThat(existingPerson.getIdentificationType()).isEqualTo("PASSPORT");
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("A98765432");
        verify(personRepository).save(existingPerson);
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
    void updatePerson_verified_dobChangedWithValidReentry_clearsVerificationAndAuditsReset() {
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        existingPerson.setIdentificationVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setIdentificationVerifiedBy(UUID.randomUUID());
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("950505145555", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("950505145555")).thenReturn("newHash");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("newHash", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1995, 5, 5));
        request.setIcOrPassport("950505145555");
        request.setIdentificationType("MALAYSIAN_IC");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getIdentificationVerifiedAt()).isNull();
        assertThat(existingPerson.getIdentificationVerifiedBy()).isNull();
        assertThat(existingPerson.getIdentificationVerifiedByName()).isNull();
        assertThat(existingPerson.getIdentificationVerificationMethod()).isNull();
        verify(auditLogger).logIdentityVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_phoneOnlyChange_resendingSameDobAndGender_staysVerified() {
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        java.time.LocalDateTime verifiedAt = java.time.LocalDateTime.now();
        UUID adminId = UUID.randomUUID();
        existingPerson.setIdentificationVerifiedAt(verifiedAt);
        existingPerson.setIdentificationVerifiedBy(adminId);
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("PRE_REGISTRATION_RECORD");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(existingPerson.getDob());
        request.setGender(existingPerson.getGender());
        request.setPhone("+60123456789");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("VERIFIED");
        assertThat(existingPerson.getIdentificationVerifiedAt()).isEqualTo(verifiedAt);
        assertThat(existingPerson.getIdentificationVerifiedBy()).isEqualTo(adminId);
        assertThat(existingPerson.getIdentificationVerifiedByName()).isEqualTo("Admin User");
        assertThat(existingPerson.getIdentificationVerificationMethod()).isEqualTo("PRE_REGISTRATION_RECORD");
        verify(auditLogger, never()).logIdentityVerificationReset(any(), any());
    }

    @Test
    void updatePerson_verified_passportHolder_genderChanged_clearsVerificationAndAuditsReset() {
        existingPerson.setIdentificationType("PASSPORT");
        existingPerson.setIcOrPassport("A12345678");
        existingPerson.setGender("MALE");
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        existingPerson.setIdentificationVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setIdentificationVerifiedBy(UUID.randomUUID());
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setGender("FEMALE");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getGender()).isEqualTo("FEMALE");
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
        assertThat(existingPerson.getIdentificationVerifiedAt()).isNull();
        assertThat(existingPerson.getIdentificationVerifiedBy()).isNull();
        assertThat(existingPerson.getIdentificationVerifiedByName()).isNull();
        assertThat(existingPerson.getIdentificationVerificationMethod()).isNull();
        verify(auditLogger).logIdentityVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_dobChanged_contradictingIc_neverAuditsReset() {
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        existingPerson.setIdentificationVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setIdentificationVerifiedBy(UUID.randomUUID());
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1995, 5, 5));
        request.setIcOrPassport("900101011235");
        request.setIdentificationType("MALAYSIAN_IC");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(IllegalArgumentException.class);

        verify(auditLogger, never()).logIdentityVerificationReset(any(), any());
    }

    @Test
    void updatePerson_verified_dobChanged_validReEntry_auditsResetAfterSave() {
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        existingPerson.setIdentificationVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setIdentificationVerifiedBy(UUID.randomUUID());
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("950505145555", personId)).thenReturn(false);
        when(identificationHashService.isConfigured()).thenReturn(true);
        when(identificationHashService.computeHash("950505145555")).thenReturn("newHash");
        when(identificationHashService.getActiveVersion()).thenReturn(1);
        when(personRepository.existsByIdentificationHashAndIdNot("newHash", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1995, 5, 5));
        request.setIcOrPassport("950505145555");
        request.setIdentificationType("MALAYSIAN_IC");

        personService.updatePerson(personId, request);

        InOrder inOrder = inOrder(personRepository, auditLogger);
        inOrder.verify(personRepository).save(any(Person.class));
        inOrder.verify(auditLogger).logIdentityVerificationReset(eq(existingPerson), any());
    }

    @Test
    void updatePerson_verified_dobChanged_duplicateIc_neverAuditsReset() {
        existingPerson.setIdentificationVerificationStatus("VERIFIED");
        existingPerson.setIdentificationVerifiedAt(java.time.LocalDateTime.now());
        existingPerson.setIdentificationVerifiedBy(UUID.randomUUID());
        existingPerson.setIdentificationVerifiedByName("Admin User");
        existingPerson.setIdentificationVerificationMethod("DOCUMENT_SIGHTED");

        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByIcOrPassportAndIdNot("950505145555", personId)).thenReturn(true);

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setDob(LocalDate.of(1995, 5, 5));
        request.setIcOrPassport("950505145555");
        request.setIdentificationType("MALAYSIAN_IC");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(DuplicateIcException.class);

        verify(auditLogger, never()).logIdentityVerificationReset(any(), any());
    }

    // -----------------------------------------------------------------------
    // DEF-R01: Email normalisation & duplicate handling
    // -----------------------------------------------------------------------

    @Test
    void createPerson_blankEmail_savedWithNull() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("   ");
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        UUID newId = UUID.randomUUID();
        when(personRepository.save(any(Person.class))).thenAnswer(i -> {
            Person p = i.getArgument(0);
            p.setId(newId);
            return p;
        });
        when(personRepository.findById(newId)).thenAnswer(i -> Optional.of(Person.builder().id(newId).build()));

        personService.createPerson(organisationId, request);

        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isNull();
    }

    @Test
    void createPerson_twoCreatesWithBlankEmail_bothSucceed() {
        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> {
            Person p = i.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });
        when(personRepository.findById(any(UUID.class))).thenAnswer(i -> {
            UUID id = i.getArgument(0);
            return Optional.of(Person.builder().id(id).build());
        });

        CreatePersonRequest req1 = new CreatePersonRequest();
        req1.setFirstName("Person");
        req1.setLastName("One");
        req1.setEmail("");
        req1.setGender("MALE");
        personService.createPerson(organisationId, req1);

        CreatePersonRequest req2 = new CreatePersonRequest();
        req2.setFirstName("Person");
        req2.setLastName("Two");
        req2.setEmail("   ");
        req2.setGender("FEMALE");
        personService.createPerson(organisationId, req2);

        ArgumentCaptor<Person> captor = ArgumentCaptor.forClass(Person.class);
        verify(personRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<Person> saved = captor.getAllValues();
        assertThat(saved.get(0).getEmail()).isNull();
        assertThat(saved.get(1).getEmail()).isNull();
    }

    @Test
    void createPerson_duplicateEmail_throwsDuplicateEmailException() {
        CreatePersonRequest request = new CreatePersonRequest();
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setEmail("taken@example.com");
        request.setGender("MALE");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThatThrownBy(() -> personService.createPerson(organisationId, request))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void updatePerson_blankEmail_clearsEmailToNull() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("   ");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isNull();
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
        when(personRepository.existsByEmailAndIdNot("other@example.com", personId)).thenReturn(true);

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail("other@example.com");

        assertThatThrownBy(() -> personService.updatePerson(personId, request))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void updatePerson_sameEmail_succeeds() {
        existingPerson.setEmail("existing@example.com");
        when(personRepository.findById(personId)).thenReturn(Optional.of(existingPerson));
        when(personRepository.existsByEmailAndIdNot("existing@example.com", personId)).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        PersonUpdateRequest request = new PersonUpdateRequest();
        request.setEmail(" existing@example.com ");

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getEmail()).isEqualTo("existing@example.com");
    }
}
