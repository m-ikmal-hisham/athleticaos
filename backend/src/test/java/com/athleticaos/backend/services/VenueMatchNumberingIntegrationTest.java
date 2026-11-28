package com.athleticaos.backend.services;

import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.support.IntegrationTestUsers;
import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchRenumberResponse;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchResultType;
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
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
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
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, roles = "SUPER_ADMIN")
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
    private com.athleticaos.backend.repositories.TournamentVenueRepository venueRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private MatchService matchService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManager entityManager;

    private Organisation testOrg;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        testOrg = organisationRepository.findBySlug("test-venue-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Test Venue Org")
                        .orgType("CLUB")
                        .slug("test-venue-org")
                        .build()));
    }

    /**
     * Declares venues on a tournament. Matches may only be assigned a venue the organiser has
     * declared — the service resolves a venue name against this list and rejects anything else —
     * so tests that create matches through MatchService must declare their venues first.
     */
    private void declareVenues(Tournament tournament, String... names) {
        int order = 0;
        for (String name : names) {
            venueRepository.saveAndFlush(com.athleticaos.backend.entities.TournamentVenue.builder()
                    .tournament(tournament)
                    .name(name)
                    .displayOrder(order++)
                    .build());
        }
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
        declareVenues(tournament, "Venue A", "Venue B - Pitch A");

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
        declareVenues(tournament, "Venue A");
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
        declareVenues(tournament, "Venue 1");

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
        declareVenues(tournament, "Venue A", "Venue B - Pitch A", "Venue B");

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
        declareVenues(tournament, "Venue A");

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
        declareVenues(tournament, "Venue A", "Venue B - Pitch A", "Venue B");

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

    private TournamentVenue createVenue(Tournament tournament, String name, int displayOrder) {
        return venueRepository.saveAndFlush(TournamentVenue.builder()
                .tournament(tournament)
                .name(name)
                .displayOrder(displayOrder)
                .build());
    }

    private Team createTeam(String name, String shortName) {
        return teamRepository.saveAndFlush(Team.builder()
                .name(name)
                .shortName(shortName)
                .slug("venue-test-" + UUID.randomUUID())
                .organisation(testOrg)
                .category("MENS")
                .ageGroup("OPEN")
                .build());
    }

    @Test
    @DisplayName("Moving a match between registered venues with colliding matchNumber reallocates to destination max+1 without altering other fixtures")
    void moveMatchBetweenRegisteredVenuesReallocatesOnCollision() {
        Tournament tournament = createTournament("Reassign Collision Cup", "reassign-collision-cup");
        TournamentVenue venueA = createVenue(tournament, "Pitch A", 0);
        TournamentVenue venueB = createVenue(tournament, "Pitch B", 1);

        MatchResponse m1A = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueA.getId())
                .matchCode("SYN-A1")
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        MatchResponse m1B = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueB.getId())
                .matchCode("SYN-B1")
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 30))
                .build(), new MockHttpServletRequest());

        assertThat(m1A.getMatchNumber()).isEqualTo(1);
        assertThat(m1B.getMatchNumber()).isEqualTo(1);

        MatchResponse moved = matchService.updateMatch(m1B.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        assertThat(moved.getVenueId()).isEqualTo(venueA.getId());
        assertThat(moved.getVenue()).isEqualTo("Pitch A");
        assertThat(moved.getMatchNumber()).isEqualTo(2);
        assertThat(moved.getMatchCode()).isEqualTo("SYN-B1");

        // Original match at Pitch A is untouched
        Match reloadedA = reloadMatch(m1A.getId());
        assertThat(reloadedA.getVenueId()).isEqualTo(venueA.getId());
        assertThat(reloadedA.getMatchNumber()).isEqualTo(1);

        Match reloadedMoved = reloadMatch(m1B.getId());
        assertThat(reloadedMoved.getVenueId()).isEqualTo(venueA.getId());
        assertThat(reloadedMoved.getMatchNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("Moving to a venue where old number is free preserves matchNumber; null matchNumber allocates on genuine move")
    void moveToFreeNumberPreservesAndNullNumberAllocates() {
        Tournament tournament = createTournament("Free And Null Move Cup", "free-null-move-cup");
        TournamentVenue venueA = createVenue(tournament, "Pitch A", 0);
        TournamentVenue venueB = createVenue(tournament, "Pitch B", 1);

        matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueA.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());
        MatchResponse m2A = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueA.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());
        matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueB.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        // Move #2 from Pitch A to Pitch B where #2 is free -> stays #2
        MatchResponse movedFree = matchService.updateMatch(m2A.getId(), MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());
        assertThat(movedFree.getMatchNumber()).isEqualTo(2);

        // A match with null matchNumber moving to Pitch B gets max+1 (3)
        Match nullNumberMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Pitch A")
                .matchNumber(null)
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(11, 0))
                .status(MatchStatus.SCHEDULED)
                .build());

        // Same-venue no-op leaves null matchNumber untouched
        MatchResponse noOp = matchService.updateMatch(nullNumberMatch.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());
        assertThat(noOp.getMatchNumber()).isNull();

        // Genuine move allocates 3 at Pitch B
        MatchResponse movedNull = matchService.updateMatch(nullNumberMatch.getId(), MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());
        assertThat(movedNull.getMatchNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("Same-venue resubmission, omitted venue, legacy venue name, and unassigned null-venue collisions behave safely")
    void sameVenueOmittedLegacyAndUnassignedMoves() {
        Tournament tournament = createTournament("Venue Paths Cup", "venue-paths-cup");
        TournamentVenue venueA = createVenue(tournament, "Pitch A", 0);
        TournamentVenue venueB = createVenue(tournament, "Pitch B", 1);

        MatchResponse m1A = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueA.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());
        MatchResponse m1B = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueB.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 15))
                .build(), new MockHttpServletRequest());
        MatchResponse m1Null = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(null)
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 30))
                .build(), new MockHttpServletRequest());

        assertThat(m1A.getMatchNumber()).isEqualTo(1);
        assertThat(m1B.getMatchNumber()).isEqualTo(1);
        assertThat(m1Null.getMatchNumber()).isEqualTo(1);

        // Same-venue resubmission preserves number
        MatchResponse sameVenue = matchService.updateMatch(m1A.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());
        assertThat(sameVenue.getMatchNumber()).isEqualTo(1);

        // Venue omitted preserves venue and number
        MatchResponse omitted = matchService.updateMatch(m1A.getId(), MatchUpdateRequest.builder()
                .pitch("Sub-Pitch 1")
                .build(), new MockHttpServletRequest());
        assertThat(omitted.getVenueId()).isEqualTo(venueA.getId());
        assertThat(omitted.getMatchNumber()).isEqualTo(1);

        // Move from registered venue to unassigned (null) with collision -> allocates #2 in unassigned scope
        MatchResponse clearedToNull = matchService.updateMatch(m1B.getId(), MatchUpdateRequest.builder()
                .venueId(null)
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());
        assertThat(clearedToNull.getVenueId()).isNull();
        assertThat(clearedToNull.getVenue()).isNull();
        assertThat(clearedToNull.getMatchNumber()).isEqualTo(2);

        // Move from unassigned (#1) to Pitch A (already has #1) via legacy venue name -> allocates #2 at Pitch A
        MatchResponse fromNullLegacy = matchService.updateMatch(m1Null.getId(), MatchUpdateRequest.builder()
                .venue("pitch a")
                .build(), new MockHttpServletRequest());
        assertThat(fromNullLegacy.getVenueId()).isEqualTo(venueA.getId());
        assertThat(fromNullLegacy.getVenue()).isEqualTo("Pitch A");
        assertThat(fromNullLegacy.getMatchNumber()).isEqualTo(2);

        // Clear via blank legacy venue string back to unassigned (which currently has #2 from m1B) -> #2 is occupied, gets #3
        MatchResponse blankLegacyClear = matchService.updateMatch(m1Null.getId(), MatchUpdateRequest.builder()
                .venue("   ")
                .build(), new MockHttpServletRequest());
        assertThat(blankLegacyClear.getVenueId()).isNull();
        assertThat(blankLegacyClear.getVenue()).isNull();
        assertThat(blankLegacyClear.getMatchNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("Invalid, deleted, or foreign-tournament venue is rejected and rolled back leaving original match intact")
    void invalidDeletedOrForeignVenueRollsBackCleanly() {
        Tournament t1 = createTournament("Rollback Cup 1", "rollback-cup-1");
        Tournament t2 = createTournament("Rollback Cup 2", "rollback-cup-2");
        TournamentVenue activeVenue = createVenue(t1, "Pitch Active", 0);
        TournamentVenue deletedVenue = venueRepository.saveAndFlush(TournamentVenue.builder()
                .tournament(t1)
                .name("Pitch Deleted")
                .displayOrder(1)
                .deleted(true)
                .build());
        TournamentVenue foreignVenue = createVenue(t2, "Foreign Pitch", 0);

        LocalDate originalDate = LocalDate.of(2026, 11, 28);
        LocalTime originalTime = LocalTime.of(13, 45);
        MatchResponse created = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(t1.getId())
                .venueId(activeVenue.getId())
                .matchCode("SYN-RB-1")
                .matchDate(originalDate)
                .kickOffTime(originalTime)
                .build(), new MockHttpServletRequest());

        for (UUID badVenueId : List.of(UUID.randomUUID(), deletedVenue.getId(), foreignVenue.getId())) {
            assertThatThrownBy(() -> matchService.updateMatch(created.getId(), MatchUpdateRequest.builder()
                    .venueId(badVenueId)
                    .venueIdSet(true)
                    .matchDate(originalDate.plusDays(1))
                    .kickOffTime(LocalTime.of(16, 0))
                    .build(), new MockHttpServletRequest()))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        assertThatThrownBy(() -> matchService.updateMatch(created.getId(), MatchUpdateRequest.builder()
                .venue("Pitch Deleted")
                .matchDate(originalDate.plusDays(1))
                .build(), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class);

        Match reloaded = reloadMatch(created.getId());
        assertThat(reloaded.getVenueId()).isEqualTo(activeVenue.getId());
        assertThat(reloaded.getVenue()).isEqualTo("Pitch Active");
        assertThat(reloaded.getMatchNumber()).isEqualTo(1);
        assertThat(reloaded.getMatchCode()).isEqualTo("SYN-RB-1");
        assertThat(reloaded.getMatchDate()).isEqualTo(originalDate);
        assertThat(reloaded.getKickOffTime()).isEqualTo(originalTime);
    }

    @Test
    @DisplayName("Different categories share venue numbering on move and venue-only move preserves all unrelated fields")
    void multiCategorySharedNumberingAndUnrelatedFieldsPreserved() {
        Tournament tournament = createTournament("Preservation Cup", "preservation-cup");
        TournamentVenue venueA = createVenue(tournament, "Pitch A", 0);
        TournamentVenue venueB = createVenue(tournament, "Pitch B", 1);
        TournamentCategory cat1 = createCategory(tournament, "U12");
        TournamentCategory cat2 = createCategory(tournament, "U15");

        TournamentStage stage1 = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament).category(cat1).name("U12 Pool").stageType(TournamentStageType.POOL)
                .displayOrder(1).isGroupStage(true).isKnockoutStage(false).build());
        TournamentStage stage2 = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament).category(cat2).name("U15 Pool").stageType(TournamentStageType.POOL)
                .displayOrder(2).isGroupStage(true).isKnockoutStage(false).build());

        Team home = createTeam("Synthetic Lions", "SLI");
        Team away = createTeam("Synthetic Tigers", "STI");

        // Category 1 already occupies #1 at Pitch A
        MatchResponse cat1Match = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .stageId(stage1.getId())
                .venueId(venueA.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(8, 30))
                .build(), new MockHttpServletRequest());
        assertThat(cat1Match.getMatchNumber()).isEqualTo(1);

        UUID nextWinnerId = UUID.randomUUID();
        UUID nextLoserId = UUID.randomUUID();
        LocalDate correctedDate = LocalDate.of(2026, 11, 29);
        LocalTime correctedKickOff = LocalTime.of(14, 20);

        Match cat2Match = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .category(cat2)
                .stage(stage2)
                .homeTeam(home)
                .awayTeam(away)
                .tournamentVenue(venueB)
                .venue("Pitch B")
                .matchNumber(1)
                .matchCode("SYN-U15-P1")
                .matchDate(correctedDate)
                .kickOffTime(correctedKickOff)
                .homeScore(19)
                .awayScore(7)
                .status(MatchStatus.COMPLETED)
                .resultType(MatchResultType.NORMAL)
                .winnerTeam(home)
                .nextMatchIdForWinner(nextWinnerId)
                .winnerSlot("HOME")
                .nextMatchIdForLoser(nextLoserId)
                .loserSlot("AWAY")
                .build());

        MatchResponse moved = matchService.updateMatch(cat2Match.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        assertThat(moved.getVenueId()).isEqualTo(venueA.getId());
        assertThat(moved.getMatchNumber()).isEqualTo(2);

        Match reloaded = reloadMatch(cat2Match.getId());
        assertThat(reloaded.getMatchDate()).isEqualTo(correctedDate);
        assertThat(reloaded.getKickOffTime()).isEqualTo(correctedKickOff);
        assertThat(reloaded.getMatchCode()).isEqualTo("SYN-U15-P1");
        assertThat(reloaded.getHomeScore()).isEqualTo(19);
        assertThat(reloaded.getAwayScore()).isEqualTo(7);
        assertThat(reloaded.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(reloaded.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(reloaded.getWinnerTeam().getId()).isEqualTo(home.getId());
        assertThat(reloaded.getHomeTeam().getId()).isEqualTo(home.getId());
        assertThat(reloaded.getAwayTeam().getId()).isEqualTo(away.getId());
        assertThat(reloaded.getCategory().getId()).isEqualTo(cat2.getId());
        assertThat(reloaded.getStage().getId()).isEqualTo(stage2.getId());
        assertThat(reloaded.getNextMatchIdForWinner()).isEqualTo(nextWinnerId);
        assertThat(reloaded.getWinnerSlot()).isEqualTo("HOME");
        assertThat(reloaded.getNextMatchIdForLoser()).isEqualTo(nextLoserId);
        assertThat(reloaded.getLoserSlot()).isEqualTo("AWAY");
    }

    @Test
    @DisplayName("Concurrency: two concurrent venue moves into the same destination succeed with distinct numbers")
    void concurrentMovesIntoSameVenueSucceedWithDistinctNumbers() throws Exception {
        Tournament tournament = createTournament("Concurrent Move Cup", "concurrent-move-cup");
        TournamentVenue destVenue = createVenue(tournament, "Dest Pitch", 0);
        TournamentVenue srcVenue1 = createVenue(tournament, "Src Pitch 1", 1);
        TournamentVenue srcVenue2 = createVenue(tournament, "Src Pitch 2", 2);

        MatchResponse dest1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId()).venueId(destVenue.getId())
                .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());
        MatchResponse src1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId()).venueId(srcVenue1.getId())
                .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(9, 30))
                .build(), new MockHttpServletRequest());
        MatchResponse src2 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId()).venueId(srcVenue2.getId())
                .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(10, 0))
                .build(), new MockHttpServletRequest());

        List<MatchResponse> results = runConcurrently(
                () -> matchService.updateMatch(src1.getId(), MatchUpdateRequest.builder()
                        .venueId(destVenue.getId()).venueIdSet(true).build(), new MockHttpServletRequest()),
                () -> matchService.updateMatch(src2.getId(), MatchUpdateRequest.builder()
                        .venueId(destVenue.getId()).venueIdSet(true).build(), new MockHttpServletRequest())
        );

        Set<Integer> allocatedNumbers = Set.of(results.get(0).getMatchNumber(), results.get(1).getMatchNumber());
        assertThat(allocatedNumbers).containsExactlyInAnyOrder(2, 3);
        assertThat(reloadMatch(dest1.getId()).getMatchNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("Concurrency: venue move versus match creation into same destination succeed with distinct numbers")
    void concurrentMoveVersusCreateSucceedsWithDistinctNumbers() throws Exception {
        Tournament tournament = createTournament("Move Vs Create Cup", "move-vs-create-cup");
        TournamentVenue destVenue = createVenue(tournament, "Dest Pitch", 0);
        TournamentVenue srcVenue = createVenue(tournament, "Src Pitch", 1);

        MatchResponse dest1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId()).venueId(destVenue.getId())
                .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());
        MatchResponse src1 = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId()).venueId(srcVenue.getId())
                .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(9, 30))
                .build(), new MockHttpServletRequest());

        List<MatchResponse> results = runConcurrently(
                () -> matchService.updateMatch(src1.getId(), MatchUpdateRequest.builder()
                        .venueId(destVenue.getId()).venueIdSet(true).build(), new MockHttpServletRequest()),
                () -> matchService.createMatch(MatchCreateRequest.builder()
                        .tournamentId(tournament.getId()).venueId(destVenue.getId())
                        .matchDate(LocalDate.of(2026, 11, 28)).kickOffTime(LocalTime.of(10, 0))
                        .build(), new MockHttpServletRequest())
        );

        Set<Integer> allocatedNumbers = Set.of(results.get(0).getMatchNumber(), results.get(1).getMatchNumber());
        assertThat(allocatedNumbers).containsExactlyInAnyOrder(2, 3);
        assertThat(reloadMatch(dest1.getId()).getMatchNumber()).isEqualTo(1);
    }

    @Test
    @DisplayName("Concurrency: venue move versus renumber serialize cleanly and preserve dates, kick-off times, codes and results")
    void concurrentMoveVersusRenumberSerializesCleanlyAndPreservesMatchData() throws Exception {
        Tournament tournament = createTournament("Move Vs Renumber Cup", "move-vs-renumber-cup");
        TournamentVenue venueA = createVenue(tournament, "Pitch A", 0);
        TournamentVenue venueB = createVenue(tournament, "Pitch B", 1);
        Team home = createTeam("Concurrent Home", "CHO");
        Team away = createTeam("Concurrent Away", "CAW");

        LocalDate matchDay = LocalDate.of(2026, 11, 28);
        Match mLateA = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).tournamentVenue(venueA).venue("Pitch A")
                .matchNumber(1).matchCode("SYN-RN-1")
                .matchDate(matchDay).kickOffTime(LocalTime.of(11, 0))
                .homeTeam(home).awayTeam(away).homeScore(14).awayScore(7)
                .status(MatchStatus.COMPLETED).resultType(MatchResultType.NORMAL).winnerTeam(home)
                .build());
        Match mEarlyA = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).tournamentVenue(venueA).venue("Pitch A")
                .matchNumber(2).matchCode("SYN-RN-2")
                .matchDate(matchDay).kickOffTime(LocalTime.of(9, 0))
                .status(MatchStatus.SCHEDULED)
                .build());
        Match mB = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).tournamentVenue(venueB).venue("Pitch B")
                .matchNumber(1).matchCode("SYN-RN-3")
                .matchDate(matchDay).kickOffTime(LocalTime.of(10, 0))
                .homeTeam(home).awayTeam(away).homeScore(10).awayScore(5)
                .status(MatchStatus.COMPLETED).resultType(MatchResultType.NORMAL).winnerTeam(home)
                .build());

        runConcurrently(
                () -> matchService.updateMatch(mB.getId(), MatchUpdateRequest.builder()
                        .venueId(venueA.getId()).venueIdSet(true).build(), new MockHttpServletRequest()),
                () -> matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest())
        );

        Match reloadedLateA = reloadMatch(mLateA.getId());
        Match reloadedEarlyA = reloadMatch(mEarlyA.getId());
        Match reloadedB = reloadMatch(mB.getId());

        // All three are now at Pitch A with unique positive numbers
        assertThat(reloadedB.getVenueId()).isEqualTo(venueA.getId());
        assertThat(Set.of(
                reloadedLateA.getMatchNumber(),
                reloadedEarlyA.getMatchNumber(),
                reloadedB.getMatchNumber())).hasSize(3);

        // Dates, kick-off times, codes and results are preserved
        assertThat(reloadedLateA.getMatchDate()).isEqualTo(matchDay);
        assertThat(reloadedLateA.getKickOffTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(reloadedLateA.getMatchCode()).isEqualTo("SYN-RN-1");
        assertThat(reloadedLateA.getHomeScore()).isEqualTo(14);
        assertThat(reloadedLateA.getAwayScore()).isEqualTo(7);
        assertThat(reloadedLateA.getStatus()).isEqualTo(MatchStatus.COMPLETED);

        assertThat(reloadedB.getMatchDate()).isEqualTo(matchDay);
        assertThat(reloadedB.getKickOffTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(reloadedB.getMatchCode()).isEqualTo("SYN-RN-3");
        assertThat(reloadedB.getHomeScore()).isEqualTo(10);
        assertThat(reloadedB.getAwayScore()).isEqualTo(5);
        assertThat(reloadedB.getStatus()).isEqualTo(MatchStatus.COMPLETED);
    }

    @Test
    void sameVenueEditRefreshesStateAfterConcurrentRenumberCommits() throws Exception {
        Tournament tournament = createTournament("Stale Same Venue Cup", "stale-same-venue-cup");
        TournamentVenue venue = createVenue(tournament, "Pitch A", 0);
        LocalDate day = LocalDate.of(2026, 11, 28);
        Match late = matchRepository.saveAndFlush(Match.builder().tournament(tournament)
                .tournamentVenue(venue).venue("Pitch A").matchNumber(1).matchCode("SYN-STALE-LATE")
                .matchDate(day).kickOffTime(LocalTime.of(11, 0)).status(MatchStatus.SCHEDULED).build());
        Match early = matchRepository.saveAndFlush(Match.builder().tournament(tournament)
                .tournamentVenue(venue).venue("Pitch A").matchNumber(2).matchCode("SYN-STALE-EARLY")
                .matchDate(day).kickOffTime(LocalTime.of(9, 0)).status(MatchStatus.SCHEDULED).build());
        CountDownLatch loaded = new CountDownLatch(1);
        CountDownLatch renumbered = new CountDownLatch(1);

        runConcurrently(
                () -> new TransactionTemplate(transactionManager).execute(status -> {
                    Match stale = matchRepository.findById(late.getId()).orElseThrow();
                    assertThat(stale.getMatchNumber()).isEqualTo(1);
                    loaded.countDown();
                    awaitSignal(renumbered);
                    return matchService.updateMatch(late.getId(), MatchUpdateRequest.builder()
                            .venueId(venue.getId()).venueIdSet(true).pitch("Updated pitch label").build(),
                            new MockHttpServletRequest());
                }),
                () -> {
                    awaitSignal(loaded);
                    MatchRenumberResponse result = matchService.renumberMatches(
                            tournament.getId(), false, new MockHttpServletRequest());
                    // Service return means its transaction has committed before releasing the editor.
                    renumbered.countDown();
                    return result;
                });

        Match saved = reloadMatch(late.getId());
        assertThat(saved.getMatchNumber()).isEqualTo(2);
        assertThat(saved.getPitch()).isEqualTo("Updated pitch label");
        assertThat(saved.getKickOffTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(saved.getMatchCode()).isEqualTo("SYN-STALE-LATE");
        assertThat(reloadMatch(early.getId()).getMatchNumber()).isEqualTo(1);
    }

    private static void awaitSignal(CountDownLatch signal) {
        try {
            assertThat(signal.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted waiting for test transaction", e);
        }
    }

    @SafeVarargs
    private final <T> List<T> runConcurrently(Callable<T>... tasks) throws Exception {
        SecurityContext parentContext = SecurityContextHolder.getContext();
        ExecutorService pool = Executors.newFixedThreadPool(tasks.length);
        CountDownLatch ready = new CountDownLatch(tasks.length);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new java.util.ArrayList<>();
            for (Callable<T> task : tasks) {
                futures.add(pool.submit(() -> {
                    SecurityContextHolder.setContext(parentContext);
                    try {
                        ready.countDown();
                        assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                        return task.call();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<T> results = new java.util.ArrayList<>();
            for (Future<T> f : futures) {
                results.add(f.get(15, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            pool.shutdownNow();
            pool.awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
