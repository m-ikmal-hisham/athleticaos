package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.RegisterPersonRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.exceptions.EmailRequiredException;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.PersonDuplicateService;
import com.athleticaos.backend.services.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OrganisationServiceImplTest {

    @Mock
    private OrganisationRepository organisationRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private PersonRepository personRepository;
    @Mock
    private OrganisationPersonRepository organisationPersonRepository;
    @Mock
    private UserService userService;
    @Mock
    private PersonDuplicateService personDuplicateService;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private ObjectProvider<HttpServletRequest> requestProvider;
    @Mock
    private AccessScopeService accessScopeService;

    @InjectMocks
    private OrganisationServiceImpl organisationService;

    private UUID organisationId;
    private Organisation organisation;

    @BeforeEach
    void setUp() {
        organisationId = UUID.randomUUID();
        organisation = Organisation.builder()
                .id(organisationId)
                .name("Test Organisation")
                .build();
        lenient().when(accessScopeService.isOrganisationInScope(any())).thenReturn(true);
    }

    @Test
    void registerPerson_missingEmail_throwsEmailRequiredException() {
        RegisterPersonRequest request = new RegisterPersonRequest();
        request.setFirstName("Test");
        request.setLastName("User");
        request.setGender("MALE");
        request.setDob(LocalDate.of(2000, 1, 1));
        request.setEmail("   ");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));

        assertThatThrownBy(() -> organisationService.registerPerson(organisationId, request))
                .isInstanceOf(EmailRequiredException.class);
    }

    @Test
    void registerPerson_duplicateEmailDifferentCase_throwsDuplicateEmailException() {
        RegisterPersonRequest request = new RegisterPersonRequest();
        request.setFirstName("Test");
        request.setLastName("User");
        request.setGender("MALE");
        request.setDob(LocalDate.of(2000, 1, 1));
        request.setEmail("Case@Example.Test");

        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(personRepository.existsByEmailIgnoreCase("case@example.test")).thenReturn(true);

        assertThatThrownBy(() -> organisationService.registerPerson(organisationId, request))
                .isInstanceOf(DuplicateEmailException.class);
        verify(personRepository).existsByEmailIgnoreCase("case@example.test");
    }

    @Test
    void getPersonsByOrganisationInScope_whenInScope_returnsPersons() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(true);
        Person person = new Person();
        person.setId(UUID.randomUUID());
        person.setFirstName("Person");
        person.setLastName("A");
        person.setEmail("person.a@example.test");
        person.setRegistrationNo("AOS-900001");
        OrganisationPerson op = OrganisationPerson.builder().organisation(organisation).person(person).build();
        when(organisationPersonRepository.findByOrganisationIdOrHierarchy(organisationId)).thenReturn(List.of(op));

        var result = organisationService.getPersonsByOrganisationInScope(organisationId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRegistrationNo()).isEqualTo("AOS-900001");
        assertThat(result.get(0).getEmail()).isEqualTo("person.a@example.test");
    }

    @Test
    void getPersonsByOrganisationInScope_whenOutOfScope_returnsEmptyList() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        var result = organisationService.getPersonsByOrganisationInScope(organisationId);

        assertThat(result).isEmpty();
        verify(organisationPersonRepository, org.mockito.Mockito.never()).findByOrganisationIdOrHierarchy(any());
    }

    @Test
    void getPersonsByOrganisationInScope_whenSuperAdmin_returnsPersons() {
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(true);
        when(organisationPersonRepository.findByOrganisationIdOrHierarchy(organisationId)).thenReturn(List.of());

        var result = organisationService.getPersonsByOrganisationInScope(organisationId);

        assertThat(result).isNotNull();
    }

    // W3: registerPerson scope test
    @Test
    void registerPerson_whenOrganisationOutOfScope_throwsNotFoundWithExactMessageAndNeverChecksDuplicates() {
        when(organisationRepository.findById(organisationId)).thenReturn(Optional.of(organisation));
        when(accessScopeService.isOrganisationInScope(organisationId)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        RegisterPersonRequest request = new RegisterPersonRequest();
        request.setFirstName("Person");
        request.setLastName("Synthetic A");
        request.setGender("MALE");
        request.setDob(LocalDate.of(1993, 3, 3));
        request.setEmail("person.synthetic.a@example.test");

        assertThatThrownBy(() -> organisationService.registerPerson(organisationId, request))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Organisation not found with ID: " + organisationId);

        verify(personDuplicateService, never()).check(any(), any(), any(), any(), any());
        verify(personRepository, never()).saveAndFlush(any());
    }
}
