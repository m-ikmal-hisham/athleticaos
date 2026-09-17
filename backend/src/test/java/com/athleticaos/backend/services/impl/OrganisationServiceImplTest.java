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

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
}
