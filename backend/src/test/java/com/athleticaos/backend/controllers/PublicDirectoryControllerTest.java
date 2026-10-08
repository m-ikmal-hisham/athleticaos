package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.public_api.PublicPlayerListItemResponse;
import com.athleticaos.backend.dtos.public_api.PublicTeamDetailResponse;
import com.athleticaos.backend.dtos.public_api.PublicTeamSummaryResponse;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.PlayerTeamService;
import com.athleticaos.backend.services.StatisticsService;
import com.athleticaos.backend.services.TeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {PublicProfileController.class, PlayerController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class PublicDirectoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TeamService teamService;

    @MockBean
    private PlayerService playerService;

    @MockBean
    private PlayerTeamRepository playerTeamRepository;

    @MockBean
    private MatchLineupRepository matchLineupRepository;

    @MockBean
    private StatisticsService statisticsService;

    @MockBean
    private TournamentTeamRepository tournamentTeamRepository;

    @MockBean
    private PlayerTeamService playerTeamService;

    @MockBean
    private TournamentPlayerRepository tournamentPlayerRepository;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private PlayerRepository playerRepository;

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
    @DisplayName("GET /api/public/players without page parameter returns JSON array (legacy backwards compatibility)")
    void getPublicPlayers_unpaged_returnsJsonArray() throws Exception {
        Person person = Person.builder().firstName("Ali").lastName("Ahmad").state("Selangor").build();
        Player player = Player.builder().id(UUID.randomUUID()).slug("ali-ahmad").person(person).build();

        when(playerRepository.findAllWithPersonByDeletedFalseOrderByCreatedAtDesc())
                .thenReturn(List.of(player));

        mockMvc.perform(get("/api/public/players"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(List.class)))
                .andExpect(jsonPath("$[0].firstName").value("Ali"))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("GET /api/public/players with page parameter returns PublicPageResponse object")
    void getPublicPlayers_paged_returnsPageEnvelope() throws Exception {
        Person person = Person.builder().firstName("Ali").lastName("Ahmad").state("Selangor").build();
        Player player = Player.builder().id(UUID.randomUUID()).slug("ali-ahmad").person(person).build();

        when(playerRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(player), org.springframework.data.domain.PageRequest.of(0, 24), 1));

        mockMvc.perform(get("/api/public/players").param("page", "0").param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", isA(List.class)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(24))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items[0].firstName").value("Ali"))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("GET /api/public/teams without page parameter returns JSON array")
    void getPublicTeams_unpaged_returnsJsonArray() throws Exception {
        Team team = Team.builder().id(UUID.randomUUID()).name("Kuala Lumpur RFC").slug("kl-rfc").state("Kuala Lumpur").build();
        when(teamRepository.findAllActiveWithOrganisation()).thenReturn(List.of(team));

        mockMvc.perform(get("/api/public/teams"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(List.class)))
                .andExpect(jsonPath("$[0].name").value("Kuala Lumpur RFC"))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("GET /api/public/teams with page parameter returns PublicPageResponse object")
    void getPublicTeams_paged_returnsPageEnvelope() throws Exception {
        Team team = Team.builder().id(UUID.randomUUID()).name("Kuala Lumpur RFC").slug("kl-rfc").state("Kuala Lumpur").build();
        when(teamRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(team), org.springframework.data.domain.PageRequest.of(0, 24), 1));

        mockMvc.perform(get("/api/public/teams").param("page", "0").param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", isA(List.class)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(24))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Kuala Lumpur RFC"))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("/api/public/players/filters resolves to filter options, not /players/{idOrSlug}")
    void getPublicPlayerFilters_resolvesToFiltersEndpoint() throws Exception {
        when(playerRepository.findDistinctStatesOfActivePlayers()).thenReturn(List.of("Selangor", "Johor"));
        when(playerTeamRepository.findDistinctActivePositions()).thenReturn(List.of("Prop", "Hooker"));

        mockMvc.perform(get("/api/public/players/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.states", contains("Johor", "Selangor")))
                .andExpect(jsonPath("$.positions", contains("Hooker", "Prop")))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("/api/public/teams/filters resolves to filter options, not /teams/{idOrSlug}")
    void getPublicTeamFilters_resolvesToFiltersEndpoint() throws Exception {
        when(teamRepository.findDistinctStatesOfActiveTeams()).thenReturn(List.of("Penang", "Kedah"));
        when(teamRepository.findDistinctCategoriesOfActiveTeams()).thenReturn(List.of("MENS", "WOMENS"));

        mockMvc.perform(get("/api/public/teams/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.states", contains("Kedah", "Penang")))
                .andExpect(jsonPath("$.categories", contains("MENS", "WOMENS")))
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }

    @Test
    @DisplayName("Public list has public Cache-Control; authenticated /api/v1 endpoint keeps no-cache/no-store")
    @WithMockUser(roles = "PLAYER")
    void securityCacheHeaders_distinguishPublicFromV1() throws Exception {
        UUID playerId = UUID.randomUUID();
        when(playerService.getPlayerInScope(playerId.toString()))
                .thenReturn(PlayerResponse.builder().id(playerId).build());

        // Authenticated v1 endpoint should have no-cache, no-store
        mockMvc.perform(get("/api/v1/players/{idOrSlug}", playerId))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-cache")))
                .andExpect(header().string("Cache-Control", containsString("no-store")));

        // Public endpoint should have public Cache-Control
        when(playerRepository.findAllWithPersonByDeletedFalseOrderByCreatedAtDesc())
                .thenReturn(List.of());

        mockMvc.perform(get("/api/public/players"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=30, stale-while-revalidate=120"));
    }
}
