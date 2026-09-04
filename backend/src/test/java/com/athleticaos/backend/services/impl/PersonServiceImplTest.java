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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PersonServiceImplTest {

    @Mock
    private PersonRepository personRepository;
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
                .icOrPassport("900101011234")
                .identificationType("MALAYSIAN_IC")
                .identificationHash("hash900101011234")
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
                .isInstanceOf(IllegalArgumentException.class)
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
        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101011234");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hash900101011234");
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
        when(personRepository.existsByIcOrPassport("900101015679")).thenReturn(false);
        when(personRepository.save(any(Person.class))).thenAnswer(i -> i.getArgument(0));

        personService.updatePerson(personId, request);

        assertThat(existingPerson.getIcOrPassport()).isEqualTo("900101015679");
        assertThat(existingPerson.getIdentificationHash()).isEqualTo("hashNew900101015679");
        assertThat(existingPerson.getIdentificationHashVersion()).isEqualTo(1);
        assertThat(existingPerson.getIdentificationVerificationStatus()).isEqualTo("UNVERIFIED");
    }
}
