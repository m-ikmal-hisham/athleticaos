package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.common.PageResponse;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.TeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {PlayerController.class, TeamController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class AdminDirectoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlayerService playerService;

    @MockBean
    private TeamService teamService;

    @MockBean
    private PlayerRepository playerRepository;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private AuditLogger auditLogger;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() throws Exception {
        doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/players without page parameter returns JSON array")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetPlayersUnpagedReturnsJsonArray() throws Exception {
        PlayerResponse player = PlayerResponse.builder()
                .id(UUID.randomUUID())
                .firstName("John")
                .lastName("Doe")
                .build();

        when(playerService.getAllPlayers(null, null)).thenReturn(List.of(player));

        mockMvc.perform(get("/api/v1/players"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].firstName", is("John")));

        verify(playerService).getAllPlayers(null, null);
        verify(playerService, never()).getPlayersPage(anyInt(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/players with page parameter returns PageResponse")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetPlayersPagedReturnsPageResponse() throws Exception {
        PlayerResponse player = PlayerResponse.builder()
                .id(UUID.randomUUID())
                .firstName("Jane")
                .build();

        PageResponse<PlayerResponse> pageResponse = new PageResponse<>(
                List.of(player),
                0,
                24,
                1L,
                1,
                false
        );

        when(playerService.getPlayersPage(0, 24, "Jane", null, null, null, "recent"))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "Jane")
                        .param("sort", "recent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.page", is(0)))
                .andExpect(jsonPath("$.size", is(24)))
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.totalPages", is(1)))
                .andExpect(jsonPath("$.hasNext", is(false)))
                .andExpect(jsonPath("$.items[0].firstName", is("Jane")));

        verify(playerService).getPlayersPage(0, 24, "Jane", null, null, null, "recent");
        verify(playerService, never()).getAllPlayers(any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/players/status-counts resolves to status counts and not getPlayerByIdOrSlug")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetPlayerStatusCountsRoute() throws Exception {
        Map<String, Long> counts = Map.of("ACTIVE", 42L, "ALL", 42L);
        when(playerService.getPlayerStatusCounts(null, null, null)).thenReturn(counts);

        mockMvc.perform(get("/api/v1/players/status-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ACTIVE", is(42)))
                .andExpect(jsonPath("$.ALL", is(42)));

        verify(playerService).getPlayerStatusCounts(null, null, null);
        verify(playerService, never()).getPlayerInScope(any());
    }

    @Test
    @DisplayName("GET /api/v1/teams without page parameter returns JSON array")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetTeamsUnpagedReturnsJsonArray() throws Exception {
        TeamResponse team = TeamResponse.builder()
                .id(UUID.randomUUID())
                .name("Harlequins")
                .build();

        when(teamService.getAllTeams(null)).thenReturn(List.of(team));

        mockMvc.perform(get("/api/v1/teams"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Harlequins")));

        verify(teamService).getAllTeams(null);
        verify(teamService, never()).getTeamsPage(anyInt(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("GET /api/v1/teams with page parameter returns PageResponse")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetTeamsPagedReturnsPageResponse() throws Exception {
        TeamResponse team = TeamResponse.builder()
                .id(UUID.randomUUID())
                .name("Saracens")
                .build();

        PageResponse<TeamResponse> pageResponse = new PageResponse<>(
                List.of(team),
                0,
                24,
                1L,
                1,
                false
        );

        when(teamService.getTeamsPage(0, 24, "Sara", null, "Men", null, null, "name"))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/teams")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "Sara")
                        .param("category", "Men")
                        .param("sort", "name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.page", is(0)))
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].name", is("Saracens")));

        verify(teamService).getTeamsPage(0, 24, "Sara", null, "Men", null, null, "name");
        verify(teamService, never()).getAllTeams(any());
    }

    @Test
    @DisplayName("GET /api/v1/teams/filters resolves to filters endpoint and not getTeamById")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetTeamFiltersRoute() throws Exception {
        AdminTeamFiltersResponse filters = new AdminTeamFiltersResponse(
                List.of(new AdminTeamFiltersResponse.OrganisationOption(UUID.randomUUID(), "Selangor RFC")),
                List.of("Men", "Women"),
                List.of("Under-18"),
                List.of("Selangor")
        );

        when(teamService.getTeamFilters()).thenReturn(filters);

        mockMvc.perform(get("/api/v1/teams/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organisations").isArray())
                .andExpect(jsonPath("$.organisations", hasSize(1)))
                .andExpect(jsonPath("$.organisations[0].name", is("Selangor RFC")))
                .andExpect(jsonPath("$.categories[0]", is("Men")))
                .andExpect(jsonPath("$.categories[1]", is("Women")))
                .andExpect(jsonPath("$.ageGroups[0]", is("Under-18")))
                .andExpect(jsonPath("$.states[0]", is("Selangor")));

        verify(teamService).getTeamFilters();
        verify(teamService, never()).getTeamById(any());
    }

    @Test
    @DisplayName("GET /api/v1/teams/category-counts resolves to category counts and not getTeamById")
    @WithMockUser(roles = "SUPER_ADMIN")
    void testGetTeamCategoryCountsRoute() throws Exception {
        Map<String, Long> counts = Map.of("MEN", 15L, "WOMEN", 8L, "ALL", 23L);
        when(teamService.getTeamCategoryCounts(null, null, null, null)).thenReturn(counts);

        mockMvc.perform(get("/api/v1/teams/category-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.MEN", is(15)))
                .andExpect(jsonPath("$.WOMEN", is(8)))
                .andExpect(jsonPath("$.ALL", is(23)));

        verify(teamService).getTeamCategoryCounts(null, null, null, null);
        verify(teamService, never()).getTeamById(any());
    }
}
