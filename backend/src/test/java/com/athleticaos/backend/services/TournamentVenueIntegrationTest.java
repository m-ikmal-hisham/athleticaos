package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchRenumberResponse;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.dtos.tournament.CreateVenueRequest;
import com.athleticaos.backend.dtos.tournament.TournamentVenueDTO;
import com.athleticaos.backend.dtos.tournament.UpdateVenueRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class TournamentVenueIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentVenueService venueService;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private MatchService matchService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        testOrg = organisationRepository.findBySlug("test-venue-mgmt-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Test Venue Management Org")
                        .orgType("CLUB")
                        .slug("test-venue-mgmt-org")
                        .build()));
    }

    private Tournament createTournament(String name, String slug) {
        return tournamentRepository.saveAndFlush(Tournament.builder()
                .name(name)
                .slug(slug + "-" + UUID.randomUUID())
                .level("REGIONAL")
                .venue("Headline Complex")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(testOrg)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .build());
    }

    @Test
    @DisplayName("Venue CRUD: create, list, update, and duplicate enforcement")
    void venueCrudAndDuplicateEnforcement() throws Exception {
        Tournament tournament = createTournament("Venue CRUD Cup", "venue-crud-cup");

        // 1. Create Stadium 1
        CreateVenueRequest req1 = CreateVenueRequest.builder()
                .name("Stadium 1")
                .displayOrder(0)
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/v1/tournaments/{idOrSlug}/venues", tournament.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        TournamentVenueDTO venue1 = objectMapper.readValue(createResult.getResponse().getContentAsString(), TournamentVenueDTO.class);
        assertThat(venue1.getId()).isNotNull();
        assertThat(venue1.getName()).isEqualTo("Stadium 1");

        // 2. Reject duplicate venue name (exact match)
        mockMvc.perform(post("/api/v1/tournaments/{idOrSlug}/venues", tournament.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isBadRequest());

        // 3. Reject duplicate venue name (case-insensitive and trimmed match)
        CreateVenueRequest reqDuplicate = CreateVenueRequest.builder()
                .name("  stadium 1  ")
                .build();
        mockMvc.perform(post("/api/v1/tournaments/{idOrSlug}/venues", tournament.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqDuplicate)))
                .andExpect(status().isBadRequest());

        // 4. Same venue name on DIFFERENT tournament succeeds
        Tournament otherTournament = createTournament("Other Cup", "other-cup");
        mockMvc.perform(post("/api/v1/tournaments/{idOrSlug}/venues", otherTournament.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated());

        // 5. Create Stadium 2 on first tournament
        CreateVenueRequest req2 = CreateVenueRequest.builder()
                .name("Stadium 2")
                .displayOrder(1)
                .build();
        mockMvc.perform(post("/api/v1/tournaments/{idOrSlug}/venues", tournament.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isCreated());

        // 6. List venues
        MvcResult listResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/venues", tournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        List<TournamentVenueDTO> venues = objectMapper.readValue(
                listResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructCollectionType(List.class, TournamentVenueDTO.class));
        assertThat(venues).hasSize(2);
        assertThat(venues.get(0).getName()).isEqualTo("Stadium 1");
        assertThat(venues.get(1).getName()).isEqualTo("Stadium 2");

        // 7. Update venue name
        UpdateVenueRequest updateReq = UpdateVenueRequest.builder()
                .name("Main Arena")
                .displayOrder(0)
                .build();
        MvcResult updateResult = mockMvc.perform(put("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", tournament.getId(), venue1.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andReturn();

        TournamentVenueDTO updated = objectMapper.readValue(updateResult.getResponse().getContentAsString(), TournamentVenueDTO.class);
        assertThat(updated.getName()).isEqualTo("Main Arena");

        // 8. Updating to an existing venue name in same tournament fails with 400
        UpdateVenueRequest collisionReq = UpdateVenueRequest.builder()
                .name("Stadium 2")
                .build();
        mockMvc.perform(put("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", tournament.getId(), venue1.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(collisionReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Venue deletion rejected when matches are assigned, succeeds when no matches assigned")
    void venueDeletionGuardedByAssignedMatches() throws Exception {
        Tournament tournament = createTournament("Venue Deletion Guard Cup", "deletion-guard-cup");

        TournamentVenueDTO venue = venueService.createVenue(tournament.getId(), CreateVenueRequest.builder()
                .name("Pitch Alpha")
                .build());

        // Create match assigned to venue
        MatchResponse match = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venue.getId())
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        assertThat(match.getVenueId()).isEqualTo(venue.getId());
        assertThat(match.getVenue()).isEqualTo("Pitch Alpha");

        // Attempt to delete venue -> must fail with 400 or 409 Bad Request / Conflict
        mockMvc.perform(delete("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", tournament.getId(), venue.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("currently assigned to it")));

        // Clear venue from match (set to null / unassigned)
        matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venueId(null)
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        Match updatedMatch = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(updatedMatch.getTournamentVenue()).isNull();
        assertThat(updatedMatch.getVenue()).isNull();

        // Now deleting the venue must succeed
        mockMvc.perform(delete("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", tournament.getId(), venue.getId()))
                .andExpect(status().isNoContent());

        // Venue is now deleted, fetching list should not include it
        List<TournamentVenueDTO> remaining = venueService.getVenuesByTournament(tournament.getId());
        assertThat(remaining).isEmpty();
    }

    @Test
    @DisplayName("A legacy venue name resolves to a declared venue, and an undeclared name is rejected")
    void legacyVenueNameResolvesButNeverCreates() {
        Tournament tournament = createTournament("Legacy Venue Name Cup", "legacy-venue-name-cup");

        TournamentVenueDTO declared = venueService.createVenue(tournament.getId(), CreateVenueRequest.builder()
                .name("Pitch Alpha")
                .build());

        // A caller still sending the venue as a name resolves to the declared venue, case-insensitively.
        MatchResponse match = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("pitch alpha")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        assertThat(match.getVenueId()).isEqualTo(declared.getId());
        assertThat(match.getVenue()).isEqualTo("Pitch Alpha");

        // A name the organiser never declared is a typo, not a new venue. It must be rejected
        // rather than silently registered, which is what put eleven venues into one tournament.
        assertThatThrownBy(() -> matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Pitch Alph")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .build(), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown venue");

        // The rejected name must not have been added to the registry.
        assertThat(venueService.getVenuesByTournament(tournament.getId()))
                .extracting(TournamentVenueDTO::getName)
                .containsExactly("Pitch Alpha");

        // Same rule on update.
        assertThatThrownBy(() -> matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venue("Pitch Beta")
                .build(), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unknown venue");

        assertThat(venueService.getVenuesByTournament(tournament.getId())).hasSize(1);
    }

    @Test
    @DisplayName("Strict tournament scoping: venue operations across different tournaments return 404")
    void strictTournamentScoping() throws Exception {
        Tournament t1 = createTournament("Tournament 1", "tournament-1");
        Tournament t2 = createTournament("Tournament 2", "tournament-2");

        TournamentVenueDTO venueInT1 = venueService.createVenue(t1.getId(), CreateVenueRequest.builder()
                .name("T1 Arena")
                .build());

        // Try to GET venueInT1 using t2's ID -> 404
        mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", t2.getId(), venueInT1.getId()))
                .andExpect(status().isNotFound());

        // Try to UPDATE venueInT1 using t2's ID -> 404
        UpdateVenueRequest updateReq = UpdateVenueRequest.builder().name("Hacked Name").build();
        mockMvc.perform(put("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", t2.getId(), venueInT1.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound());

        // Try to DELETE venueInT1 using t2's ID -> 404
        mockMvc.perform(delete("/api/v1/tournaments/{idOrSlug}/venues/{venueId}", t2.getId(), venueInT1.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Updating venue name cascades to denormalized matches.venue string")
    void venueRenamingUpdatesAssignedMatches() {
        Tournament tournament = createTournament("Cascade Rename Cup", "cascade-rename-cup");

        TournamentVenueDTO venue = venueService.createVenue(tournament.getId(), CreateVenueRequest.builder()
                .name("Old Stadium Name")
                .build());

        MatchResponse match = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venue.getId())
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        assertThat(match.getVenue()).isEqualTo("Old Stadium Name");

        // Rename venue
        venueService.updateVenue(tournament.getId(), venue.getId(), UpdateVenueRequest.builder()
                .name("New Grand Stadium")
                .build());

        // Verify match denormalized string was updated
        Match reloaded = matchRepository.findById(match.getId()).orElseThrow();
        assertThat(reloaded.getVenue()).isEqualTo("New Grand Stadium");
        MatchResponse response = matchService.getMatchById(match.getId());
        assertThat(response.getVenue()).isEqualTo("New Grand Stadium");
        assertThat(response.getVenueName()).isEqualTo("New Grand Stadium");
    }

    @Test
    @DisplayName("Matches with explicit venueId, unassigned venue, and renumbering breakdown")
    void matchesWithVenueIdAndRenumberBreakdown() {
        Tournament tournament = createTournament("Renumber Breakdown Cup", "renumber-breakdown-cup");

        TournamentVenueDTO v1 = venueService.createVenue(tournament.getId(), CreateVenueRequest.builder()
                .name("Court 1")
                .displayOrder(0)
                .build());

        TournamentVenueDTO v2 = venueService.createVenue(tournament.getId(), CreateVenueRequest.builder()
                .name("Court 2")
                .displayOrder(1)
                .build());

        // Create 2 matches on Court 1
        MatchResponse m1Court1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(v1.getId())
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m2Court1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(v1.getId())
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        // Create 1 match on Court 2
        MatchResponse m1Court2 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(v2.getId())
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        // Create 1 unassigned match (null venueId)
        MatchResponse m1Unassigned = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(null)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        assertThat(m1Court1.getMatchNumber()).isEqualTo(1);
        assertThat(m2Court1.getMatchNumber()).isEqualTo(2);
        assertThat(m1Court2.getMatchNumber()).isEqualTo(1);
        assertThat(m1Unassigned.getMatchNumber()).isEqualTo(1);

        // Run renumber preview
        MatchRenumberResponse renumberRes = matchService.renumberMatches(tournament.getId(), true, new MockHttpServletRequest());
        assertThat(renumberRes.getMatchesTotal()).isEqualTo(4);
        assertThat(renumberRes.getVenueBreakdown()).hasSize(3); // Court 1, Court 2, Unassigned

        // Check venue breakdown details
        MatchRenumberResponse.VenueBreakdown vbCourt1 = renumberRes.getVenueBreakdown().stream()
                .filter(b -> v1.getId().equals(b.getVenueId()))
                .findFirst().orElseThrow();
        assertThat(vbCourt1.getVenueName()).isEqualTo("Court 1");
        assertThat(vbCourt1.getMatchCount()).isEqualTo(2);

        MatchRenumberResponse.VenueBreakdown vbUnassigned = renumberRes.getVenueBreakdown().stream()
                .filter(b -> b.getVenueId() == null)
                .findFirst().orElseThrow();
        assertThat(vbUnassigned.getVenueName()).isEqualTo("Unassigned");
        assertThat(vbUnassigned.getMatchCount()).isEqualTo(1);
    }
}
