package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.DecideLevelKnockoutRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.entities.TournamentTeam;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.enums.TournamentFormat;
import com.athleticaos.backend.repositories.TournamentFormatConfigRepository;
import com.athleticaos.backend.enums.DecidedBy;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.support.IntegrationTestUsers;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class KnockoutTieBreakIntegrationTest {

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
    private TeamRepository teamRepository;
    @Autowired
    private TournamentTeamRepository tournamentTeamRepository;
    @Autowired
    private TournamentStageRepository stageRepository;
    @Autowired
    private MatchRepository matchRepository;
    @Autowired
    private MatchService matchService;
    @Autowired
    private TournamentFormatConfigRepository formatConfigRepository;
    @Autowired
    private PlatformTransactionManager transactionManager;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        testOrg = organisationRepository.findBySlug("tiebreak-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Tie Break Test Org")
                        .orgType("CLUB")
                        .slug("tiebreak-org")
                        .build()));
    }

    private Team createTeam(String name, String shortName, String slug) {
        return teamRepository.findBySlug(slug)
                .orElseGet(() -> teamRepository.saveAndFlush(Team.builder()
                        .name(name)
                        .shortName(shortName)
                        .slug(slug)
                        .organisation(testOrg)
                        .status("Active")
                        .category("SENIOR")
                        .ageGroup("OPEN")
                        .division("DIV_1")
                        .state("SELANGOR")
                        .build()));
    }

    private Tournament createTournament(String name, String slug) {
        return tournamentRepository.saveAndFlush(Tournament.builder()
                .name(name)
                .slug(slug + "-" + UUID.randomUUID())
                .level("REGIONAL")
                .venue("National Stadium")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(testOrg)
                .startDate(LocalDate.now().minusDays(1))
                .endDate(LocalDate.now().plusDays(2))
                .build());
    }

    private Match reloadMatch(UUID matchId) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            entityManager.clear();
            return matchRepository.findById(matchId).orElseThrow();
        });
    }

    /** A level quarter-final (10-10, still live) whose winner feeds a semi-final and loser a 3rd-place playoff. */
    private record LevelQf(Match qf, Match sf, Match bronze, Team home, Team away) {}

    private int nextMatchNumber = 0;

    private LevelQf levelQf(Tournament tournament, String label) {
        Team home = createTeam(label + " Home", "H" + label.charAt(0), "tb-home-" + UUID.randomUUID());
        Team away = createTeam(label + " Away", "A" + label.charAt(0), "tb-away-" + UUID.randomUUID());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder().tournament(tournament).team(home).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder().tournament(tournament).team(away).isActive(true).deleted(false).build());

        TournamentStage qfStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament).name(label + " Quarter-Finals").stageType(TournamentStageType.QUARTER_FINAL)
                .isGroupStage(false).isKnockoutStage(true).displayOrder(1).build());
        TournamentStage sfStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament).name(label + " Semi-Finals").stageType(TournamentStageType.SEMI_FINAL)
                .isGroupStage(false).isKnockoutStage(true).displayOrder(2).build());
        TournamentStage bronzeStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament).name(label + " 3rd Place Playoff").stageType(TournamentStageType.THIRD_PLACE)
                .isGroupStage(false).isKnockoutStage(true).displayOrder(3).build());

        Match sf = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).stage(sfStage).status(MatchStatus.SCHEDULED)
                .matchCode(label + "-SF1").matchNumber(++nextMatchNumber).matchDate(LocalDate.now()).kickOffTime(LocalTime.of(16, 0)).build());
        Match bronze = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).stage(bronzeStage).status(MatchStatus.SCHEDULED)
                .matchCode(label + "-BR").matchNumber(++nextMatchNumber).matchDate(LocalDate.now()).kickOffTime(LocalTime.of(17, 0)).build());
        Match qf = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament).stage(qfStage).homeTeam(home).awayTeam(away)
                .homeScore(10).awayScore(10).status(MatchStatus.ONGOING)
                .nextMatchIdForWinner(sf.getId()).winnerSlot("HOME")
                .nextMatchIdForLoser(bronze.getId()).loserSlot("AWAY")
                .matchCode(label + "-QF1").matchNumber(++nextMatchNumber).matchDate(LocalDate.now()).kickOffTime(LocalTime.of(14, 0)).build());
        return new LevelQf(qf, sf, bronze, home, away);
    }

    private DecideLevelKnockoutRequest decide(DecidedBy method, Team winner, Integer kicksHome, Integer kicksAway) {
        DecideLevelKnockoutRequest req = new DecideLevelKnockoutRequest();
        req.setMethod(method.name());
        req.setWinnerTeamId(winner.getId());
        req.setDropKicksHome(kicksHome);
        req.setDropKicksAway(kicksAway);
        return req;
    }

    /** The decided QF is completed with the expected winner, who is in the SF; the other team is in the 3rd-place playoff. */
    private void assertDecidedAndProgressed(LevelQf b, DecidedBy method, Team winner, Team loser) {
        Match qf = reloadMatch(b.qf().getId());
        assertThat(qf.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(qf.getDecidedBy()).isEqualTo(method.name());
        assertThat(qf.getWinnerTeam().getId()).isEqualTo(winner.getId());
        assertThat(reloadMatch(b.sf().getId()).getHomeTeam().getId()).isEqualTo(winner.getId());
        assertThat(reloadMatch(b.bronze().getId()).getAwayTeam().getId()).isEqualTo(loser.getId());
    }

    @Test
    @DisplayName("QF level score cannot be completed without decision, completes with each method and advances")
    void qfLevelTieBreakersAndProgression() {
        Tournament tournament = createTournament("TieBreak Tourney", "tb-tourney");

        // Guard: a level knockout match cannot be completed without a decision.
        LevelQf guard = levelQf(tournament, "Guard");
        assertThatThrownBy(() -> matchService.updateMatchStatus(guard.qf().getId(), "COMPLETED", new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must be decided by a tie-breaker");
        assertThat(reloadMatch(guard.qf().getId()).getStatus()).isEqualTo(MatchStatus.ONGOING);

        // Default setting is the extra time sequence, so the first try rule is refused for now.
        assertThatThrownBy(() -> matchService.decideLevelKnockout(guard.qf().getId(),
                decide(DecidedBy.FIRST_TRY, guard.home(), null, null), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class);

        // Drop kicks: the away team wins 2-1 (level tallies and the wrong winner are refused).
        LevelQf dk = levelQf(tournament, "Kicks");
        assertThatThrownBy(() -> matchService.decideLevelKnockout(dk.qf().getId(),
                decide(DecidedBy.DROP_KICKS, dk.away(), 1, 1), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> matchService.decideLevelKnockout(dk.qf().getId(),
                decide(DecidedBy.DROP_KICKS, dk.home(), 1, 2), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class);
        matchService.decideLevelKnockout(dk.qf().getId(), decide(DecidedBy.DROP_KICKS, dk.away(), 1, 2), new MockHttpServletRequest());
        assertDecidedAndProgressed(dk, DecidedBy.DROP_KICKS, dk.away(), dk.home());
        assertThat(reloadMatch(dk.qf().getId()).getHomeScore()).isEqualTo(10); // drop kicks never change the score

        // Coin toss: the home team wins.
        LevelQf coin = levelQf(tournament, "Coin");
        matchService.decideLevelKnockout(coin.qf().getId(), decide(DecidedBy.COIN_TOSS, coin.home(), null, null), new MockHttpServletRequest());
        assertDecidedAndProgressed(coin, DecidedBy.COIN_TOSS, coin.home(), coin.away());

        // Extra time: refused while still level; after a golden score the leader wins.
        LevelQf et = levelQf(tournament, "Extra");
        assertThatThrownBy(() -> matchService.decideLevelKnockout(et.qf().getId(),
                decide(DecidedBy.EXTRA_TIME, et.away(), null, null), new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class);
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            Match m = matchRepository.findById(et.qf().getId()).orElseThrow();
            m.setAwayScore(13);
            matchRepository.save(m);
        });
        matchService.decideLevelKnockout(et.qf().getId(), decide(DecidedBy.EXTRA_TIME, et.away(), null, null), new MockHttpServletRequest());
        assertDecidedAndProgressed(et, DecidedBy.EXTRA_TIME, et.away(), et.home());

        // First try rule once the tournament uses it.
        formatConfigRepository.saveAndFlush(TournamentFormatConfig.builder()
                .tournament(tournament)
                .formatType(TournamentFormat.KNOCKOUT)
                .rugbyFormat("SEVENS")
                .teamCount(8)
                .matchDurationMinutes(14)
                .startersCount(7)
                .knockoutTieBreaker("FIRST_TRY")
                .build());
        entityManager.clear();
        LevelQf ft = levelQf(tournament, "Try");
        matchService.decideLevelKnockout(ft.qf().getId(), decide(DecidedBy.FIRST_TRY, ft.home(), null, null), new MockHttpServletRequest());
        assertDecidedAndProgressed(ft, DecidedBy.FIRST_TRY, ft.home(), ft.away());
    }

    @Test
    @DisplayName("Pool draw and placement round robin draw complete as normal draws")
    void poolAndPlacementRoundRobinDrawsStand() {
        Tournament tournament = createTournament("Draw Tourney", "draw-tourney");
        Team teamC = createTeam("Team Charlie", "TMC", "team-charlie-" + UUID.randomUUID());
        Team teamD = createTeam("Team Delta", "TMD", "team-delta-" + UUID.randomUUID());

        TournamentStage poolStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Pool A")
                .stageType(TournamentStageType.POOL)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .displayOrder(1)
                .build());

        Match poolMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(poolStage)
                .homeTeam(teamC)
                .awayTeam(teamD)
                .homeScore(15)
                .awayScore(15)
                .status(MatchStatus.ONGOING)
                .matchCode("PA1")
                .matchNumber(10)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build());

        // Completing a pool draw must succeed with no exception
        matchService.updateMatchStatus(poolMatch.getId(), "COMPLETED", new MockHttpServletRequest());
        Match poolReloaded = reloadMatch(poolMatch.getId());
        assertThat(poolReloaded.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(poolReloaded.getWinnerTeam()).isNull();
        assertThat(poolReloaded.getDecidedBy()).isNull();

        // Placement round robin draw
        TournamentStage placementStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("5th-8th Round Robin")
                .stageType(TournamentStageType.QUARTER_FINAL)
                .isGroupStage(false)
                .isKnockoutStage(false)
                .isRoundRobin(true)
                .displayOrder(2)
                .build());

        Match rrMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(placementStage)
                .homeTeam(teamC)
                .awayTeam(teamD)
                .homeScore(7)
                .awayScore(7)
                .status(MatchStatus.ONGOING)
                .matchCode("RR1")
                .matchNumber(11)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(11, 0))
                .build());

        matchService.updateMatchStatus(rrMatch.getId(), "COMPLETED", new MockHttpServletRequest());
        Match rrReloaded = reloadMatch(rrMatch.getId());
        assertThat(rrReloaded.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(rrReloaded.getWinnerTeam()).isNull();
        assertThat(rrReloaded.getDecidedBy()).isNull();
    }
}
