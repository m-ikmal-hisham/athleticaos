package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.team.PersonSummaryDTO;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.OrganisationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrganisationController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class OrganisationControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrganisationService organisationService;

    @MockBean
    private OrganisationRepository organisationRepository;

    @MockBean
    private PersonRepository personRepository;

    @MockBean
    private AuditLogger auditLogger;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    void anonymousCannotAccessGetPersonsByOrganisation() throws Exception {
        mockMvc.perform(get("/api/v1/organisations/{id}/persons", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void roleWithoutAuthorityCannotAccessGetPersonsByOrganisation() throws Exception {
        mockMvc.perform(get("/api/v1/organisations/{id}/persons", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getPersonsByOrganisation_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID orgId = UUID.randomUUID();
        PersonSummaryDTO person = PersonSummaryDTO.builder()
                .id(UUID.randomUUID().toString())
                .registrationNo("AOS-900001")
                .firstName("Person")
                .lastName("A")
                .email("person.a@example.test")
                .build();
        when(organisationService.getPersonsByOrganisationInScope(orgId)).thenReturn(List.of(person));

        mockMvc.perform(get("/api/v1/organisations/{id}/persons", orgId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].registrationNo").value("AOS-900001"))
                .andExpect(jsonPath("$[0].email").value("person.a@example.test"));

        verify(organisationService).getPersonsByOrganisationInScope(orgId);
        verify(organisationService, never()).getPersonsByOrganisation(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getPersonsByOrganisation_whenOutOfScopeOrMissing_returns200EmptyListAndCallsInScopeMethod() throws Exception {
        UUID orgId = UUID.randomUUID();
        when(organisationService.getPersonsByOrganisationInScope(orgId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/organisations/{id}/persons", orgId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(organisationService).getPersonsByOrganisationInScope(orgId);
        verify(organisationService, never()).getPersonsByOrganisation(any());
    }
}
