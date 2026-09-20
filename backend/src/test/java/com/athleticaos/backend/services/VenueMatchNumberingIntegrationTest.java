package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchRenumberResponse;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class VenueMatchNumberingIntegrationTest {

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
    private TournamentCategoryRepository categoryRepository;

    @Autowired
    private TournamentStageRepository stageRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private MatchService matchService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManager entityManager;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        testOrg = organisationRepository.findBySlug("test-venue-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Test Venue Org")
                        .orgType("CLUB")
                        .slug("test-venue-org")
                        .build()));
    }

    private Tournament createTournament(String name, String slug) {
        return tournamentRepository.saveAndFlush(Tournament.builder()
                .name(name)
                .slug(slug + "-" + UUID.randomUUID())
                .level("REGIONAL")
                .venue("Test Complex")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(testOrg)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(2))
                .build());
    }

    private TournamentCategory createCategory(Tournament tournament, String name) {
        return categoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(tournament)
                .name(name)
                .build());
    }

    private Match reloadMatch(UUID matchId) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            entityManager.clear();
            return matchRepository.findById(matchId).orElseThrow();
        });
    }

    @Test
    @DisplayName("Numbers restart at 1 per venue and two venues produce two independent sequences")
    void numbersRestartAt1PerVenueAndAreIndependent() {
        Tournament tournament = createTournament("Two Venues Cup", "two-venues-cup");

        MatchResponse m1VenueA = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m2VenueA = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m1VenueB = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue B - Pitch A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m2VenueB = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue B - Pitch A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        assertThat(m1VenueA.getMatchNumber()).isEqualTo(1);
        assertThat(m2VenueA.getMatchNumber()).isEqualTo(2);
        assertThat(m1VenueB.getMatchNumber()).isEqualTo(1);
        assertThat(m2VenueB.getMatchNumber()).isEqualTo(2);

        // Adding a match continues venue sequence
        MatchResponse m3VenueB = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue B - Pitch A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .build(), new MockHttpServletRequest());
        assertThat(m3VenueB.getMatchNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("Two categories at one venue share one continuous sequence")
    void twoCategoriesShareContinuousSequencePerVenue() {
        Tournament tournament = createTournament("Multi Cat Cup", "multi-cat-cup");
        TournamentCategory cat1 = createCategory(tournament, "Open Men");
        TournamentCategory cat2 = createCategory(tournament, "Open Women");

        TournamentStage stage1 = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .category(cat1)
                .name("Pool A")
                .stageType(TournamentStageType.POOL)
                .displayOrder(1)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .build());

        TournamentStage stage2 = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .category(cat2)
                .name("Pool B")
                .stageType(TournamentStageType.POOL)
                .displayOrder(2)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .build());

        MatchResponse m1Cat1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .stageId(stage1.getId())
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m2Cat2 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .stageId(stage2.getId())
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        assertThat(m1Cat1.getMatchNumber()).isEqualTo(1);
        assertThat(m2Cat2.getMatchNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Blank or null venues are grouped together as unassigned group")
    void blankVenueGroupedAsUnassigned() {
        Tournament tournament = createTournament("Unassigned Venue Cup", "unassigned-venue-cup");

        MatchResponse m1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue(null)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m2 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("   ")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        assertThat(m1.getMatchNumber()).isEqualTo(1);
        assertThat(m2.getMatchNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Two-phase collision-safe renumbering handles direct swap and ordering")
    void twoPhaseCollisionSafeRenumbering() {
        Tournament tournament = createTournament("Swap Cup", "swap-cup");

        // Create match A scheduled at 11:00 AM (currently matchNumber 1)
        Match matchLate = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .build());

        // Create match B scheduled at 09:00 AM (currently matchNumber 2)
        Match matchEarly = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .matchNumber(2)
                .status(MatchStatus.SCHEDULED)
                .build());

        // Renumbering should swap: matchEarly becomes 1, matchLate becomes 2.
        // Under single-phase write this would crash with unique index collision.
        MatchRenumberResponse response = matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());

        assertThat(response.getMatchesTotal()).isEqualTo(2);
        assertThat(response.getMatchesChanged()).isEqualTo(2);

        Match reloadedEarly = reloadMatch(matchEarly.getId());
        Match reloadedLate = reloadMatch(matchLate.getId());

        assertThat(reloadedEarly.getMatchNumber()).isEqualTo(1);
        assertThat(reloadedLate.getMatchNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Renumbering dry run writes nothing and renumbering is idempotent")
    void dryRunAndIdempotency() {
        Tournament tournament = createTournament("Idempotent Cup", "idempotent-cup");

        Match m1 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(12, 0))
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .build());

        Match m2 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .matchNumber(2)
                .status(MatchStatus.SCHEDULED)
                .build());

        // Dry run
        MatchRenumberResponse dryRunRes = matchService.renumberMatches(tournament.getId(), true, new MockHttpServletRequest());
        assertThat(dryRunRes.getMatchesChanged()).isEqualTo(2);

        // Verify DB matches were NOT touched by dry run
        assertThat(reloadMatch(m1.getId()).getMatchNumber()).isEqualTo(1);
        assertThat(reloadMatch(m2.getId()).getMatchNumber()).isEqualTo(2);

        // Actual renumber
        MatchRenumberResponse executeRes = matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());
        assertThat(executeRes.getMatchesChanged()).isEqualTo(2);
        assertThat(reloadMatch(m2.getId()).getMatchNumber()).isEqualTo(1);
        assertThat(reloadMatch(m1.getId()).getMatchNumber()).isEqualTo(2);

        // Second renumber (idempotent)
        MatchRenumberResponse idempotentRes = matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());
        assertThat(idempotentRes.getMatchesChanged()).isEqualTo(0);
    }

    @Test
    @DisplayName("Ordering by match date, kickoff time, pitch ascending, and match number")
    void orderingByDateKickOffPitchAndNumber() {
        Tournament tournament = createTournament("Pitch Order Cup", "pitch-order-cup");

        Match pitchB = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Pitch 1")
                .pitch("Pitch B")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .build());

        Match pitchA = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Pitch 1")
                .pitch("Pitch A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .matchNumber(2)
                .status(MatchStatus.SCHEDULED)
                .build());

        matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());

        assertThat(reloadMatch(pitchA.getId()).getMatchNumber()).isEqualTo(1);
        assertThat(reloadMatch(pitchB.getId()).getMatchNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("CR-02 CSV exports produce 10 header fields for matches and 12 for results")
    void cr02CsvExportsProduceCorrectHeaderFields() throws Exception {
        Tournament tournament = createTournament("CSV Export Cup", "csv-export-cup");

        matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue 1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MvcResult matchesResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/matches", tournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String matchesCsv = matchesResult.getResponse().getContentAsString();
        String[] matchesLines = matchesCsv.split("\r?\n");
        assertThat(matchesLines.length).isGreaterThanOrEqualTo(1);
        String[] matchHeaders = matchesLines[0].split(",");
        assertThat(matchHeaders.length).isEqualTo(10);

        MvcResult resultsResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/results", tournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String resultsCsv = resultsResult.getResponse().getContentAsString();
        String[] resultsLines = resultsCsv.split("\r?\n");
        assertThat(resultsLines.length).isGreaterThanOrEqualTo(1);
        String[] resultHeaders = resultsLines[0].split(",");
        assertThat(resultHeaders.length).isEqualTo(12);
    }

    @Test
    @DisplayName("Part D: Cross-venue feeder matches display feeder venue in placeholders and CSV exports, same-venue remains unchanged")
    void crossVenueFeederLabelsInMatchResponseAndCsvExport() throws Exception {
        Tournament tournament = createTournament("Cross Venue Cup", "cross-venue-cup");

        Match crossVenueTarget = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue A")
                .pitch("Pitch 1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .matchNumber(1)
                .homeTeamPlaceholder("Lose 77")
                .status(MatchStatus.SCHEDULED)
                .build());

        matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue B")
                .pitch("Pitch 1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .matchNumber(77)
                .nextMatchIdForLoser(crossVenueTarget.getId())
                .loserSlot("HOME")
                .status(MatchStatus.SCHEDULED)
                .build());

        Match sameVenueTarget = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue B")
                .pitch("Pitch 2")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .matchNumber(79)
                .homeTeamPlaceholder("Lose 78")
                .status(MatchStatus.SCHEDULED)
                .build());

        matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .venue("Venue B")
                .pitch("Pitch 2")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .matchNumber(78)
                .nextMatchIdForLoser(sameVenueTarget.getId())
                .loserSlot("HOME")
                .status(MatchStatus.SCHEDULED)
                .build());

        java.util.List<MatchResponse> matches = matchService.getMatchesByTournament(tournament.getId());
        MatchResponse crossResponse = matches.stream()
                .filter(m -> m.getId().equals(crossVenueTarget.getId()))
                .findFirst().orElseThrow();
        MatchResponse sameResponse = matches.stream()
                .filter(m -> m.getId().equals(sameVenueTarget.getId()))
                .findFirst().orElseThrow();

        assertThat(crossResponse.getHomeTeamPlaceholder()).isEqualTo("Lose 77 (Venue B)");
        assertThat(sameResponse.getHomeTeamPlaceholder()).isEqualTo("Lose 78");

        MvcResult matchesResult = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/matches", tournament.getId()))
                .andExpect(status().isOk())
                .andReturn();

        String matchesCsv = matchesResult.getResponse().getContentAsString();
        assertThat(matchesCsv).contains("Lose 77 (Venue B)");
        assertThat(matchesCsv).contains("Lose 78");
    }

    @Test
    @DisplayName("Feeder placeholders store the match code and render the feeder's current number after a renumber")
    void feederPlaceholdersStoreCodeAndRenderCurrentNumber() {
        Tournament tournament = createTournament("Feeder Label Cup", "feeder-label-cup");

        MatchResponse feeder = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchCode("TEST-SF1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse target = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchCode("TEST-FIN")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(12, 0))
                .build(), new MockHttpServletRequest());

        // Created in schedule order, so the feeder is number 1 at this venue.
        assertThat(feeder.getMatchNumber()).isEqualTo(1);

        matchService.updateMatch(target.getId(), com.athleticaos.backend.dtos.match.MatchUpdateRequest.builder()
                .homeFromWinnerOfMatchId(feeder.getId())
                .build(), new MockHttpServletRequest());

        // Stored text carries the immutable match code, never a number.
        Match storedTarget = reloadMatch(target.getId());
        assertThat(storedTarget.getHomeTeamPlaceholder()).isEqualTo("Winner TEST-SF1");

        // Rendered label resolves the feeder's current number, in the list and for a single match.
        assertThat(placeholderOf(matchService.getMatchesByTournament(tournament.getId()), target.getId()))
                .isEqualTo("Winner 1");
        assertThat(matchService.getMatchById(target.getId()).getHomeTeamPlaceholder()).isEqualTo("Winner 1");

        // An earlier match added afterwards takes number 1 once the tournament is renumbered,
        // pushing the feeder to 2.
        matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(8, 0))
                .build(), new MockHttpServletRequest());
        matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());

        assertThat(reloadMatch(feeder.getId()).getMatchNumber()).isEqualTo(2);

        // Stored text is untouched by the renumber; only the rendered number moves.
        assertThat(reloadMatch(target.getId()).getHomeTeamPlaceholder()).isEqualTo("Winner TEST-SF1");
        assertThat(placeholderOf(matchService.getMatchesByTournament(tournament.getId()), target.getId()))
                .isEqualTo("Winner 2");
        assertThat(matchService.getMatchById(target.getId()).getHomeTeamPlaceholder()).isEqualTo("Winner 2");
    }

    @Test
    @DisplayName("A feeder at another venue is named with its venue")
    void feederAtAnotherVenueIsNamedWithItsVenue() {
        Tournament tournament = createTournament("Cross Venue Cup", "cross-venue-cup");

        MatchResponse feeder = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue B - Pitch A")
                .matchCode("TEST-VB1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse target = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venue("Venue A")
                .matchCode("TEST-VA1")
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(12, 0))
                .build(), new MockHttpServletRequest());

        matchService.updateMatch(target.getId(), com.athleticaos.backend.dtos.match.MatchUpdateRequest.builder()
                .homeFromLoserOfMatchId(feeder.getId())
                .build(), new MockHttpServletRequest());

        assertThat(reloadMatch(target.getId()).getHomeTeamPlaceholder()).isEqualTo("Lose TEST-VB1");
        assertThat(placeholderOf(matchService.getMatchesByTournament(tournament.getId()), target.getId()))
                .isEqualTo("Lose " + feeder.getMatchNumber() + " (Venue B - Pitch A)");
    }

    private String placeholderOf(java.util.List<MatchResponse> matches, UUID matchId) {
        return matches.stream()
                .filter(m -> m.getId().equals(matchId))
                .findFirst()
                .orElseThrow()
                .getHomeTeamPlaceholder();
    }
}
