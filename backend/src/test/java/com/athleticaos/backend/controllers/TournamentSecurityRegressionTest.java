package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.tournament.BracketViewResponse;
import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.roster.AddPlayersToRosterRequest;
import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;
import com.athleticaos.backend.dtos.roster.TournamentPlayerDTO;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        TournamentController.class,
        MatchController.class,
        MatchEventController.class,
        TournamentRosterController.class,
        MatchLineupController.class,
        PublicTournamentController.class
})
@Import({SecurityConfig.class, GlobalExceptionHandler.class, com.athleticaos.backend.mappers.PublicMatchMapper.class})
@SuppressWarnings("null")
public class TournamentSecurityRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TournamentService tournamentService;

    @MockBean
    private MatchService matchService;

    @MockBean
    private MatchEventService matchEventService;

    @MockBean
    private TournamentRosterService rosterService;

    @MockBean
    private MatchLineupService matchLineupService;

    @MockBean
    private AccessScopeService accessScopeService;

    @MockBean
    private ProgressionService progressionService;

    @MockBean
    private BracketService bracketService;

    @MockBean
    private StandingsService standingsService;

    @MockBean
    private TournamentCategoryService categoryService;

    @MockBean
    private TournamentVenueService venueService;

    @MockBean
    private TournamentReadinessService readinessService;

    @MockBean
    private StatisticsService statisticsService;

    @MockBean
    private TournamentTeamRepository tournamentTeamRepository;

    @MockBean
    private MatchEventRepository matchEventRepository;

    @MockBean
    private MatchRepository matchRepository;

    @MockBean
    private OrganisationRepository organisationRepository;

    @MockBean
    private MatchOfficialRepository matchOfficialRepository;

    @MockBean
    private TournamentStageRepository stageRepository;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    private UUID tournamentId;
    private UUID matchId;
    private UUID ownTeamId;
    private UUID otherTeamId;
    private TournamentResponse tournamentResponse;
    private MatchResponse matchResponse;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        tournamentId = UUID.randomUUID();
        matchId = UUID.randomUUID();
        ownTeamId = UUID.randomUUID();
        otherTeamId = UUID.randomUUID();

        tournamentResponse = TournamentResponse.builder()
                .id(tournamentId)
                .name("National Sevens Championship")
                .slug("national-sevens")
                .status("PUBLISHED")
                .organiserOrgId(UUID.randomUUID())
                .build();

        matchResponse = MatchResponse.builder()
                .id(matchId)
                .matchCode("M01")
                .tournamentId(tournamentId)
                .homeTeamId(ownTeamId)
                .awayTeamId(otherTeamId)
                .status("LIVE")
                .build();
    }

    // =========================================================================
    // Scenario 1: Assigned Official (out of org scope)
    // =========================================================================

    @Test
    @DisplayName("Official can GET match when assigned (even if outside org scope)")
    @WithMockUser(roles = "CLUB_ADMIN")
    void officialCanGetMatchWhenAssigned() throws Exception {
        when(matchService.getMatchById(matchId)).thenReturn(matchResponse);
        when(accessScopeService.canReadMatch(matchId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/matches/{id}", matchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(matchId.toString()));
    }

    @Test
    @DisplayName("Official can GET tournament when assigned to match/tournament")
    @WithMockUser(roles = "CLUB_ADMIN")
    void officialCanGetTournamentWhenAssigned() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.canReadTournament(tournamentId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/tournaments/{id}", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tournamentId.toString()));
    }

    @Test
    @DisplayName("Official can add a try to assigned match")
    @WithMockUser(roles = "CLUB_ADMIN")
    void officialCanAddTryToAssignedMatch() throws Exception {
        when(matchService.getMatchById(matchId)).thenReturn(matchResponse);

        MatchEventCreateRequest request = MatchEventCreateRequest.builder()
                .teamId(ownTeamId)
                .eventType(MatchEventType.TRY)
                .minute(12)
                .build();

        MatchEventResponse eventResponse = MatchEventResponse.builder()
                .id(UUID.randomUUID())
                .matchId(matchId)
                .teamId(ownTeamId)
                .eventType("TRY")
                .minute(12)
                .build();

        when(matchEventService.addEventToMatch(eq(matchId), any(), any())).thenReturn(eventResponse);

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eventType").value("TRY"));
    }

    @Test
    @DisplayName("Official can update match status to COMPLETED")
    @WithMockUser(roles = "CLUB_ADMIN")
    void officialCanCompleteMatch() throws Exception {
        MatchResponse completedMatch = MatchResponse.builder()
                .id(matchId)
                .status("COMPLETED")
                .build();

        when(matchService.updateMatchStatus(eq(matchId), eq("COMPLETED"), any())).thenReturn(completedMatch);

        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("Official CANNOT delete a match (forbidden at security level)")
    @WithMockUser(roles = "CLUB_ADMIN")
    void officialCannotDeleteMatch() throws Exception {
        mockMvc.perform(delete("/api/v1/matches/{id}", matchId))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Official CANNOT update tournament status (forbidden, no tournament-level writes)")
    @WithMockUser(roles = "OFFICIAL")
    void officialCannotUpdateTournamentStatus() throws Exception {
        mockMvc.perform(put("/api/v1/tournaments/{id}/status", tournamentId)
                        .param("status", "LIVE"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Phantom role OFFICIAL cannot add a try (rejected by role gate)")
    @WithMockUser(roles = "OFFICIAL")
    void phantomOfficialRoleCannotAddTry() throws Exception {
        MatchEventCreateRequest request = MatchEventCreateRequest.builder()
                .teamId(ownTeamId)
                .eventType(MatchEventType.TRY)
                .minute(12)
                .build();

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // Scenario 2: Club Admin whose team is entered in Org B's tournament
    // =========================================================================

    @Test
    @DisplayName("Club Admin whose team is entered can READ tournament")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminParticipatingCanReadTournament() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.canReadTournament(tournamentId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/tournaments/{id}", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tournamentId.toString()));
    }

    @Test
    @DisplayName("Club Admin whose team is entered can READ tournament roster")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminParticipatingCanReadTournamentRoster() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(rosterService.getRoster(tournamentId, ownTeamId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/tournaments/{id}/roster/{teamId}", tournamentId, ownTeamId))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Club Admin can manage own team's roster")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCanManageOwnTeamRoster() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);

        AddPlayersToRosterRequest request = AddPlayersToRosterRequest.builder()
                .playerIds(List.of(UUID.randomUUID()))
                .build();

        TournamentPlayerDTO playerDto = TournamentPlayerDTO.builder()
                .id(UUID.randomUUID())
                .tournamentJerseyNumber(10)
                .build();

        when(rosterService.addPlayersToRoster(eq(tournamentId), eq(ownTeamId), any(), any()))
                .thenReturn(List.of(playerDto));

        mockMvc.perform(post("/api/v1/tournaments/{id}/roster/{teamId}", tournamentId, ownTeamId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tournamentJerseyNumber").value(10));
    }

    @Test
    @DisplayName("Club Admin CANNOT manage other team's roster (returns 404)")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotManageOtherTeamRoster() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);

        AddPlayersToRosterRequest request = AddPlayersToRosterRequest.builder()
                .playerIds(List.of(UUID.randomUUID()))
                .build();

        when(rosterService.addPlayersToRoster(eq(tournamentId), eq(otherTeamId), any(), any()))
                .thenThrow(new EntityNotFoundException("Team not found"));

        mockMvc.perform(post("/api/v1/tournaments/{id}/roster/{teamId}", tournamentId, otherTeamId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Club Admin can manage own team's lineup")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCanManageOwnTeamLineup() throws Exception {
        MatchLineupUpdateRequest request = MatchLineupUpdateRequest.builder()
                .teamId(ownTeamId)
                .entries(Collections.emptyList())
                .build();

        when(matchLineupService.updateLineup(eq(matchId), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/v1/matches/{id}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Club Admin gets 404 when updating tournament status outside organiser scope")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotUpdateTournamentStatus() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        mockMvc.perform(put("/api/v1/tournaments/{id}/status", tournamentId)
                        .param("status", "LIVE"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Club Admin gets 404 when updating tournament format outside organiser scope")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotUpdateTournamentFormat() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO config = com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO.builder()
                .formatType(com.athleticaos.backend.enums.TournamentFormat.ROUND_ROBIN)
                .rugbyFormat("SEVENS")
                .matchDurationMinutes(14)
                .startersCount(7)
                .maxBenchCount(5)
                .build();

        mockMvc.perform(post("/api/v1/tournaments/{id}/format", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(config)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Club Admin gets 404 when building pools outside organiser scope")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotBuildPools() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        mockMvc.perform(post("/api/v1/tournaments/{id}/format/structure", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"ROUND_ROBIN\",\"numberOfPools\":2}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Club Admin gets 404 when generating bracket outside organiser scope")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotGenerateBracket() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        mockMvc.perform(post("/api/v1/tournaments/{id}/bracket/generate", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"KNOCKOUT\"}"))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // Scenario 3: Anonymous caller hitting public tournament endpoints
    // =========================================================================

    @Test
    @DisplayName("Anonymous caller can GET public tournament (200)")
    void anonymousCanGetPublicTournament() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/public/tournaments/{id}", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tournamentId.toString()))
                .andExpect(jsonPath("$.name").value("National Sevens Championship"));
    }

    @Test
    @DisplayName("Anonymous caller can GET public matches (200)")
    void anonymousCanGetPublicMatches() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(matchService.getMatchesByTournament(tournamentId)).thenReturn(List.of(matchResponse));
        when(matchOfficialRepository.findByTournamentIdWithDetails(tournamentId)).thenReturn(List.of());

        mockMvc.perform(get("/api/public/tournaments/{id}/matches", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(matchId.toString()));
    }

    @Test
    @DisplayName("Anonymous caller can GET public standings (200)")
    void anonymousCanGetPublicStandings() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(standingsService.getStandings(tournamentId)).thenReturn(List.of());

        mockMvc.perform(get("/api/public/tournaments/{id}/standings", tournamentId))
                .andExpect(status().isOk());
    }

    // =========================================================================
    // F-1: accessLevel in TournamentResponse
    // =========================================================================

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    @DisplayName("Admin list returns MANAGE for own tournament and READ_ONLY for participating one")
    void adminList_returnsManageForOwnTournament_andReadOnlyForParticipatingOne() throws Exception {
        UUID ownOrgId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();

        TournamentResponse ownTournament = TournamentResponse.builder()
                .id(UUID.randomUUID())
                .name("Own Tournament")
                .organiserOrgId(ownOrgId)
                .build();

        TournamentResponse participatingTournament = TournamentResponse.builder()
                .id(UUID.randomUUID())
                .name("Participating Tournament")
                .organiserOrgId(otherOrgId)
                .build();

        when(tournamentService.getAllTournaments(null)).thenReturn(List.of(ownTournament, participatingTournament));
        when(accessScopeService.isSuperAdmin()).thenReturn(false);
        when(accessScopeService.getAccessibleOrgIds()).thenReturn(Set.of(ownOrgId));

        mockMvc.perform(get("/api/v1/tournaments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Own Tournament"))
                .andExpect(jsonPath("$[0].accessLevel").value("MANAGE"))
                .andExpect(jsonPath("$[1].name").value("Participating Tournament"))
                .andExpect(jsonPath("$[1].accessLevel").value("READ_ONLY"));
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    @DisplayName("Admin get by id returns MANAGE for own tournament and READ_ONLY for participating one")
    void adminGetById_returnsManageOrReadOnly() throws Exception {
        UUID ownOrgId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();
        UUID ownTournId = UUID.randomUUID();
        UUID partTournId = UUID.randomUUID();

        TournamentResponse ownTournament = TournamentResponse.builder()
                .id(ownTournId)
                .name("Own Tournament")
                .organiserOrgId(ownOrgId)
                .build();

        TournamentResponse participatingTournament = TournamentResponse.builder()
                .id(partTournId)
                .name("Participating Tournament")
                .organiserOrgId(otherOrgId)
                .build();

        when(tournamentService.getTournamentById(ownTournId)).thenReturn(ownTournament);
        when(tournamentService.getTournamentById(partTournId)).thenReturn(participatingTournament);
        when(accessScopeService.canReadTournament(any(UUID.class))).thenReturn(true);
        when(accessScopeService.isSuperAdmin()).thenReturn(false);
        when(accessScopeService.isOrganisationInScope(ownOrgId)).thenReturn(true);
        when(accessScopeService.isOrganisationInScope(otherOrgId)).thenReturn(false);

        mockMvc.perform(get("/api/v1/tournaments/{id}", ownTournId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessLevel").value("MANAGE"));

        mockMvc.perform(get("/api/v1/tournaments/{id}", partTournId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessLevel").value("READ_ONLY"));
    }

    @Test
    @DisplayName("Public endpoint response has no accessLevel (null)")
    void publicTournamentEndpoint_hasNoAccessLevel() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/public/tournaments/{id}", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessLevel").doesNotExist());
    }

    @Test
    @DisplayName("Super Admin can feature a tournament")
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanFeatureTournament() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(true);
        when(accessScopeService.isSuperAdmin()).thenReturn(true);

        TournamentResponse updatedResponse = TournamentResponse.builder()
                .id(tournamentId)
                .name("National Sevens Championship")
                .featured(true)
                .featuredOrder(1)
                .build();

        when(tournamentService.updateFeatured(eq(tournamentId), any(), any())).thenReturn(updatedResponse);

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest request =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, 1);

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.featuredOrder").value(1))
                .andExpect(jsonPath("$.accessLevel").value("MANAGE"));
    }

    @Test
    @DisplayName("Org Admin in scope can feature own tournament")
    @WithMockUser(roles = "ORG_ADMIN")
    void orgAdminInScopeCanFeatureTournament() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(true);
        when(accessScopeService.isSuperAdmin()).thenReturn(false);
        when(accessScopeService.isOrganisationInScope(tournamentResponse.getOrganiserOrgId())).thenReturn(true);

        TournamentResponse updatedResponse = TournamentResponse.builder()
                .id(tournamentId)
                .name("National Sevens Championship")
                .organiserOrgId(tournamentResponse.getOrganiserOrgId())
                .featured(true)
                .featuredOrder(2)
                .build();

        when(tournamentService.updateFeatured(eq(tournamentId), any(), any())).thenReturn(updatedResponse);

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest request =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, null);

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.featuredOrder").value(2))
                .andExpect(jsonPath("$.accessLevel").value("MANAGE"));
    }

    @Test
    @DisplayName("Org Admin out of scope gets 404 Tournament not found (SEC-04)")
    @WithMockUser(roles = "ORG_ADMIN")
    void orgAdminOutOfScopeGets404() throws Exception {
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest request =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, null);

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Tournament not found"));
    }

    @Test
    @DisplayName("Club Admin cannot feature tournament (403 Forbidden)")
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCannotFeatureTournament() throws Exception {
        com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest request =
                new com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest(true, null);

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", tournamentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/public/tournaments/featured returns list with literal route winning over slug")
    void publicFeaturedTournaments_literalPathWins() throws Exception {
        TournamentResponse featuredTourn = TournamentResponse.builder()
                .id(tournamentId)
                .name("Featured Tournament")
                .slug("featured-tournament")
                .status("Upcoming")
                .featured(true)
                .featuredOrder(1)
                .build();

        when(tournamentService.getFeaturedTournaments()).thenReturn(List.of(featuredTourn));

        mockMvc.perform(get("/api/public/tournaments/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(tournamentId.toString()))
                .andExpect(jsonPath("$[0].name").value("Featured Tournament"))
                .andExpect(jsonPath("$[0].featured").value(true));
    }

    @Test
    @DisplayName("GET /api/public/tournaments/{idOrSlug} still resolves normal slugs")
    void publicTournamentDetail_normalSlugResolves() throws Exception {
        when(tournamentService.getTournamentBySlug("national-sevens")).thenReturn(tournamentResponse);
        when(tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/public/tournaments/{slug}", "national-sevens"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(tournamentId.toString()))
                .andExpect(jsonPath("$.name").value("National Sevens Championship"));
    }

    @Test
    @DisplayName("DELETE stage by user without role returns 403 Forbidden")
    @WithMockUser(roles = "OFFICIAL")
    void deleteEmptyStage_userWithoutRole_returns403() throws Exception {
        UUID stageId = UUID.randomUUID();
        mockMvc.perform(delete("/api/v1/tournaments/{id}/stages/{stageId}", tournamentId, stageId))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE stage by Club Admin outside organiser scope returns 404 (scope convention)")
    @WithMockUser(roles = "CLUB_ADMIN")
    void deleteEmptyStage_clubAdminOutOfScope_returns404() throws Exception {
        UUID stageId = UUID.randomUUID();
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(false);

        mockMvc.perform(delete("/api/v1/tournaments/{id}/stages/{stageId}", tournamentId, stageId))
                .andExpect(status().isNotFound());

        verify(tournamentService, never()).deleteEmptyStage(any(), any());
    }

    @Test
    @DisplayName("DELETE stage by Club Admin in organiser scope succeeds with 200 OK")
    @WithMockUser(roles = "CLUB_ADMIN")
    void deleteEmptyStage_clubAdminInScope_returns200() throws Exception {
        UUID stageId = UUID.randomUUID();
        when(tournamentService.getTournamentById(tournamentId)).thenReturn(tournamentResponse);
        when(accessScopeService.isTournamentInScope(tournamentId)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/tournaments/{id}/stages/{stageId}", tournamentId, stageId))
                .andExpect(status().isOk());

        verify(tournamentService).deleteEmptyStage(tournamentId, stageId);
    }
}
