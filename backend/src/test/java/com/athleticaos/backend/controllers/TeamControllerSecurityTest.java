package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.dtos.team.PersonSummaryDTO;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.TeamService;
import jakarta.persistence.EntityNotFoundException;
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

@WebMvcTest(TeamController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class TeamControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TeamService teamService;

    @MockBean
    private PlayerService playerService;

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

    // --- Anonymous Access (403) ---

    @Test
    void anonymousCannotAccessGetTeamById() throws Exception {
        mockMvc.perform(get("/api/v1/teams/{id}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessGetTeamBySlug() throws Exception {
        mockMvc.perform(get("/api/v1/teams/slug/{slug}", "team-a"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessGetPlayersByTeam() throws Exception {
        mockMvc.perform(get("/api/v1/teams/{id}/players", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessGetAvailableStaff() throws Exception {
        mockMvc.perform(get("/api/v1/teams/{id}/available-staff", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    // --- R1: GET /api/v1/teams/{id} ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamById_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        TeamResponse mockResponse = TeamResponse.builder().id(teamId).name("Team Alpha").slug("team-alpha").build();
        when(teamService.getTeamByIdInScope(teamId)).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/teams/{id}", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(teamId.toString()))
                .andExpect(jsonPath("$.name").value("Team Alpha"));

        verify(teamService).getTeamByIdInScope(teamId);
        verify(teamService, never()).getTeamById(any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamById_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        when(teamService.getTeamByIdInScope(teamId)).thenThrow(new EntityNotFoundException("Team not found"));

        mockMvc.perform(get("/api/v1/teams/{id}", teamId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Team not found"));

        verify(teamService).getTeamByIdInScope(teamId);
        verify(teamService, never()).getTeamById(any());
    }

    // --- R1: GET /api/v1/teams/slug/{slug} ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamBySlug_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        String slug = "team-alpha";
        TeamResponse mockResponse = TeamResponse.builder().id(UUID.randomUUID()).name("Team Alpha").slug(slug).build();
        when(teamService.getTeamBySlugInScope(slug)).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/teams/slug/{slug}", slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(slug));

        verify(teamService).getTeamBySlugInScope(slug);
        verify(teamService, never()).getTeamBySlug(any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamBySlug_whenOutOfScopeOrMissing_returns404WithExactSlugMessageAndCallsInScopeMethod() throws Exception {
        String slug = "team-alpha";
        when(teamService.getTeamBySlugInScope(slug)).thenThrow(new EntityNotFoundException("Team not found with slug: " + slug));

        mockMvc.perform(get("/api/v1/teams/slug/{slug}", slug))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Team not found with slug: " + slug));

        verify(teamService).getTeamBySlugInScope(slug);
        verify(teamService, never()).getTeamBySlug(any());
    }

    // --- R2: GET /api/v1/teams/{id}/players ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void getPlayersByTeam_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        PlayerInTeamDTO player = PlayerInTeamDTO.builder().playerId(UUID.randomUUID()).firstName("Player").lastName("A").email("player.a@example.test").build();
        when(teamService.getPlayersByTeamInScope(teamId, null)).thenReturn(List.of(player));

        mockMvc.perform(get("/api/v1/teams/{id}/players", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("player.a@example.test"));

        verify(teamService).getPlayersByTeamInScope(teamId, null);
        verify(teamService, never()).getPlayersByTeam(any(), any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getPlayersByTeam_whenOutOfScopeOrMissing_returns200EmptyListAndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        when(teamService.getPlayersByTeamInScope(teamId, null)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/teams/{id}/players", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(teamService).getPlayersByTeamInScope(teamId, null);
        verify(teamService, never()).getPlayersByTeam(any(), any());
    }

    // --- R3: GET /api/v1/teams/{id}/available-staff ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void getAvailablePersonsForStaff_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        PersonSummaryDTO staff = PersonSummaryDTO.builder().id(UUID.randomUUID().toString()).registrationNo("AOS-900001").email("staff.a@example.test").build();
        when(teamService.getAvailablePersonsForStaffInScope(teamId)).thenReturn(List.of(staff));

        mockMvc.perform(get("/api/v1/teams/{id}/available-staff", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].registrationNo").value("AOS-900001"));

        verify(teamService).getAvailablePersonsForStaffInScope(teamId);
        verify(teamService, never()).getAvailablePersonsForStaff(any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getAvailablePersonsForStaff_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        when(teamService.getAvailablePersonsForStaffInScope(teamId)).thenThrow(new EntityNotFoundException("Team not found"));

        mockMvc.perform(get("/api/v1/teams/{id}/available-staff", teamId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Team not found"));

        verify(teamService).getAvailablePersonsForStaffInScope(teamId);
        verify(teamService, never()).getAvailablePersonsForStaff(any());
    }
}
