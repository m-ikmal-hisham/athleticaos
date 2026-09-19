package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.person.RecordVerificationRequest;
import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.OfficialRegistryRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamStaffRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.RecordVerificationService;
import com.athleticaos.backend.services.PersonService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
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

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PersonController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
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
    private RecordVerificationService recordVerificationService;
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
    void nonSuperAdminCannotVerifyRecord() throws Exception {
        RecordVerificationRequest request = new RecordVerificationRequest(
                "PRE_REGISTRATION_RECORD", true);

        mockMvc.perform(post("/api/v1/persons/{id}/record-verification", personId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanVerifyRecord() throws Exception {
        RecordVerificationRequest request = new RecordVerificationRequest(
                "PRE_REGISTRATION_RECORD", true);

        when(recordVerificationService.verify(eq(personId), any(), any()))
                .thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        mockMvc.perform(post("/api/v1/persons/{id}/record-verification", personId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void nonSuperAdminCannotRevokeRecordVerification() throws Exception {
        mockMvc.perform(delete("/api/v1/persons/{id}/record-verification", personId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanRevokeRecordVerification() throws Exception {
        when(recordVerificationService.revoke(eq(personId), any()))
                .thenReturn(PersonResponseDTO.builder().id(personId.toString()).build());

        mockMvc.perform(delete("/api/v1/persons/{id}/record-verification", personId))
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

    // --- Anonymous Access (403) ---

    @Test
    void anonymousCannotAccessGetPersonById() throws Exception {
        mockMvc.perform(get("/api/v1/persons/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessGetUnlinkedUsers() throws Exception {
        mockMvc.perform(get("/api/v1/persons/unlinked-users/{orgId}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    // --- R5: GET /api/v1/persons/{id} ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void playerCannotAccessGetPersonById() throws Exception {
        mockMvc.perform(get("/api/v1/persons/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());

        verify(personService, never()).getPersonByIdInScope(any());
        verify(personService, never()).getPersonById(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getPersonById_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID targetId = UUID.randomUUID();
        PersonResponseDTO mockResponse = PersonResponseDTO.builder()
                .id(targetId.toString())
                .firstName("Person")
                .lastName("A")
                .email("person.a@example.test")
                .registrationNo("AOS-900001")
                .build();
        when(personService.getPersonByIdInScope(targetId)).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/persons/{id}", targetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(targetId.toString()))
                .andExpect(jsonPath("$.email").value("person.a@example.test"));

        verify(personService).getPersonByIdInScope(targetId);
        verify(personService, never()).getPersonById(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getPersonById_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        UUID targetId = UUID.randomUUID();
        when(personService.getPersonByIdInScope(targetId)).thenThrow(new EntityNotFoundException("Person not found"));

        mockMvc.perform(get("/api/v1/persons/{id}", targetId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Person not found"));

        verify(personService).getPersonByIdInScope(targetId);
        verify(personService, never()).getPersonById(any());
    }

    // --- R6: GET /api/v1/persons/unlinked-users/{orgId} ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void getUnlinkedUsers_whenNonAdmin_returnsForbidden() throws Exception {
        UUID orgId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/persons/unlinked-users/{orgId}", orgId))
                .andExpect(status().isForbidden());

        verify(personService, never()).getUnlinkedUsersInScope(any());
        verify(personService, never()).getUnlinkedUsers(any());
    }

    @Test
    @WithMockUser(roles = "COACH")
    void getUnlinkedUsers_whenCoach_returnsForbidden() throws Exception {
        UUID orgId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/persons/unlinked-users/{orgId}", orgId))
                .andExpect(status().isForbidden());

        verify(personService, never()).getUnlinkedUsersInScope(any());
        verify(personService, never()).getUnlinkedUsers(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getUnlinkedUsers_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID orgId = UUID.randomUUID();
        UserResponse user = UserResponse.builder()
                .id(UUID.randomUUID())
                .email("unlinked.user@example.test")
                .firstName("Unlinked")
                .lastName("User")
                .build();
        when(personService.getUnlinkedUsersInScope(orgId)).thenReturn(List.of(user));

        mockMvc.perform(get("/api/v1/persons/unlinked-users/{orgId}", orgId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("unlinked.user@example.test"));

        verify(personService).getUnlinkedUsersInScope(orgId);
        verify(personService, never()).getUnlinkedUsers(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void getUnlinkedUsers_whenOutOfScopeOrMissing_returns200EmptyListAndCallsInScopeMethod() throws Exception {
        UUID orgId = UUID.randomUUID();
        when(personService.getUnlinkedUsersInScope(orgId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/persons/unlinked-users/{orgId}", orgId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(personService).getUnlinkedUsersInScope(orgId);
        verify(personService, never()).getUnlinkedUsers(any());
    }

    @Test
    @WithMockUser(roles = "ORG_ADMIN")
    void deletePerson_whenOutOfScope_returns404AndNoAuditLog() throws Exception {
        org.mockito.Mockito.doThrow(new EntityNotFoundException("Person not found"))
                .when(personService).deletePerson(personId);

        mockMvc.perform(delete("/api/v1/persons/{id}", personId))
                .andExpect(status().isNotFound());

        org.mockito.Mockito.verifyNoInteractions(auditLogger);
    }
}
