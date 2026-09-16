package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.IdentityVerificationRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.repositories.OfficialRegistryRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamStaffRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.IdentityVerificationService;
import com.athleticaos.backend.services.PersonService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PersonController.class)
@Import(SecurityConfig.class)
@SuppressWarnings("null")
public class PersonControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PersonService personService;
    @MockBean
    private PersonRepository personRepository;
    @MockBean
    private PlayerRepository playerRepository;
    @MockBean
    private TeamStaffRepository teamStaffRepository;
    @MockBean
    private OfficialRegistryRepository officialRegistryRepository;
    @MockBean
    private OrganisationPersonRepository organisationPersonRepository;
    @MockBean
    private AuditLogger auditLogger;
    @MockBean
    private OrganisationRepository organisationRepository;
    @MockBean
    private IdentityVerificationService identityVerificationService;
    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean
    private UserDetailsService userDetailsService;

    private final UUID personId = UUID.randomUUID();

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void nonSuperAdminCannotVerifyIdentity() throws Exception {
        IdentityVerificationRequest request = new IdentityVerificationRequest(
                "000101141235", "PRE_REGISTRATION_RECORD", true);

        mockMvc.perform(post("/api/v1/persons/{id}/identity-verification", personId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanVerifyIdentity() throws Exception {
        IdentityVerificationRequest request = new IdentityVerificationRequest(
                "000101141235", "PRE_REGISTRATION_RECORD", true);

        when(identityVerificationService.verify(eq(personId), any(), any()))
                .thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        mockMvc.perform(post("/api/v1/persons/{id}/identity-verification", personId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void nonSuperAdminCannotRevokeIdentity() throws Exception {
        mockMvc.perform(delete("/api/v1/persons/{id}/identity-verification", personId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanRevokeIdentity() throws Exception {
        when(identityVerificationService.revoke(eq(personId), any()))
                .thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        mockMvc.perform(delete("/api/v1/persons/{id}/identity-verification", personId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void getAllPersons_withMissingEmailTrue_callsServiceWithMissingEmailTrue() throws Exception {
        org.springframework.data.domain.Page<PersonResponseDTO> emptyPage = new org.springframework.data.domain.PageImpl<>(
                java.util.Collections.emptyList(), org.springframework.data.domain.PageRequest.of(0, 50), 0);
        when(personService.getAllPersons(any(org.springframework.data.domain.Pageable.class), eq(null), eq(true))).thenReturn(emptyPage);

        mockMvc.perform(get("/api/v1/persons?missingEmail=true"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(personService).getAllPersons(any(org.springframework.data.domain.Pageable.class), eq(null), eq(true));
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getPersonsByOrganisation_withMissingEmailTrue_callsServiceWithMissingEmailTrue() throws Exception {
        UUID orgId = UUID.randomUUID();
        org.springframework.data.domain.Page<PersonResponseDTO> emptyPage = new org.springframework.data.domain.PageImpl<>(
                java.util.Collections.emptyList(), org.springframework.data.domain.PageRequest.of(0, 50), 0);
        when(personService.getPersonsByOrganisation(eq(orgId), any(org.springframework.data.domain.Pageable.class), eq(null), eq(true))).thenReturn(emptyPage);

        mockMvc.perform(get("/api/v1/persons/organisation/{orgId}?missingEmail=true", orgId))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(personService).getPersonsByOrganisation(eq(orgId), any(org.springframework.data.domain.Pageable.class), eq(null), eq(true));
    }
}
