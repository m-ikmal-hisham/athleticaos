package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentFormat;
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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class KnockoutProgressionIntegrationTest {

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
    private BracketService bracketService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private EntityManager entityManager;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        testOrg = organisationRepository.findBySlug("test-club-a-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Test Club A Org")
                        .orgType("CLUB")
                        .slug("test-club-a-org")
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
                .venue("Test Stadium")
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

    @Test
    @DisplayName("S1: QA Fixture - single pool 'Round Robin' with Final placeholders 'Round Robin1' / 'Round Robin2'")
    void s1_qaFixture_singlePool_completesAndSeedsKnockout() {
        Tournament tournament = createTournament("Test Cup S1", "test-cup-s1");
        Team teamA = createTeam("Test Club A", "TCA", "test-club-a-" + UUID.randomUUID());
        Team teamB = createTeam("Test Club B", "TCB", "test-club-b-" + UUID.randomUUID());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamA).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamB).isActive(true).deleted(false).build());

        TournamentStage poolStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Round Robin")
                .stageType(TournamentStageType.POOL)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .displayOrder(1)
                .build());

        TournamentStage finalStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Final")
                .stageType(TournamentStageType.FINAL)
                .isGroupStage(false)
                .isKnockoutStage(true)
                .displayOrder(2)
                .build());

        Match poolMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(poolStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchCode("S1-RR-M1")
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(10, 0))
                .build());

        Match finalMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(finalStage)
                .homeTeamPlaceholder("Round Robin1")
                .awayTeamPlaceholder("Round Robin2")
                .matchCode("S1-FN-M1")
                .matchNumber(2)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(12, 0))
                .build());

        // Real entry point used by MatchController
        matchService.updateMatch(poolMatch.getId(), MatchUpdateRequest.builder()
                .homeScore(20)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build(), null);

        Match reloadedFinal = reloadMatch(finalMatch.getId());
        assertThat(reloadedFinal.getHomeTeam())
                .as("Home team should be winner Team A")
                .isNotNull();
        assertThat(reloadedFinal.getHomeTeam().getId()).isEqualTo(teamA.getId());
        assertThat(reloadedFinal.getAwayTeam())
                .as("Away team should be runner-up Team B")
                .isNotNull();
        assertThat(reloadedFinal.getAwayTeam().getId()).isEqualTo(teamB.getId());
        assertThat(reloadedFinal.getHomeTeamPlaceholder()).isNull();
        assertThat(reloadedFinal.getAwayTeamPlaceholder()).isNull();
    }

    @Test
    @DisplayName("S2: Bracket generator with 2 pools - completes pool matches and seeds Semi-Finals")
    void s2_generatorTwoPools_completesAndSeedsKnockout() {
        Tournament tournament = createTournament("Test Cup S2", "test-cup-s2");
        Team teamA = createTeam("Test Club A", "TCA", "test-club-a-" + UUID.randomUUID());
        Team teamB = createTeam("Test Club B", "TCB", "test-club-b-" + UUID.randomUUID());
        Team teamC = createTeam("Test Club C", "TCC", "test-club-c-" + UUID.randomUUID());
        Team teamD = createTeam("Test Club D", "TCD", "test-club-d-" + UUID.randomUUID());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamA).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamB).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamC).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamD).isActive(true).deleted(false).build());

        // UI bracket generation call
        bracketService.generateBracketForTournament(tournament.getId(), BracketGenerationRequest.builder()
                .format(TournamentFormat.MIXED)
                .numberOfPools(2)
                .includePlacementStages(false)
                .teamIds(List.of(teamA.getId(), teamB.getId(), teamC.getId(), teamD.getId()))
                .build());

        List<TournamentStage> poolStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId()).stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsGroupStage()))
                .toList();
        List<Match> poolMatches = poolStages.stream()
                .flatMap(s -> matchRepository.findByStageId(s.getId()).stream())
                .toList();

        TournamentStage semiStage = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId()).stream()
                .filter(s -> "Semi Finals".equalsIgnoreCase(s.getName()))
                .findFirst().orElseThrow();
        List<Match> semiFinalMatches = matchRepository.findByStageId(semiStage.getId());

        assertThat(poolMatches).isNotEmpty();
        assertThat(semiFinalMatches).hasSize(2);

        // Complete all pool matches
        for (Match pm : poolMatches) {
            matchService.updateMatch(pm.getId(), MatchUpdateRequest.builder()
                    .homeScore(20)
                    .awayScore(10)
                    .status(MatchStatus.COMPLETED)
                    .build(), null);
        }

        // Verify Semi-Final matches have been seeded
        for (Match sf : semiFinalMatches) {
            Match reloaded = reloadMatch(sf.getId());
            assertThat(reloaded.getHomeTeam())
                    .as("Semi-final match " + sf.getMatchCode() + " home team should be seeded")
                    .isNotNull();
            assertThat(reloaded.getAwayTeam())
                    .as("Semi-final match " + sf.getMatchCode() + " away team should be seeded")
                    .isNotNull();
            assertThat(reloaded.getHomeTeamPlaceholder()).isNull();
            assertThat(reloaded.getAwayTeamPlaceholder()).isNull();
        }
    }

    @Test
    @DisplayName("S3: Bracket generator with 3 pools - completes pool matches and seeds knockout from overall seeding")
    void s3_generatorThreePools_completesAndSeedsKnockout() {
        Tournament tournament = createTournament("Test Cup S3", "test-cup-s3");
        Team teamA = createTeam("Test Club A", "TCA", "test-club-a-" + UUID.randomUUID());
        Team teamB = createTeam("Test Club B", "TCB", "test-club-b-" + UUID.randomUUID());
        Team teamC = createTeam("Test Club C", "TCC", "test-club-c-" + UUID.randomUUID());
        Team teamD = createTeam("Test Club D", "TCD", "test-club-d-" + UUID.randomUUID());
        Team teamE = createTeam("Test Club E", "TCE", "test-club-e-" + UUID.randomUUID());
        Team teamF = createTeam("Test Club F", "TCF", "test-club-f-" + UUID.randomUUID());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamA).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamB).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamC).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamD).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamE).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamF).isActive(true).deleted(false).build());

        bracketService.generateBracketForTournament(tournament.getId(), BracketGenerationRequest.builder()
                .format(TournamentFormat.MIXED)
                .numberOfPools(3)
                .includePlacementStages(false)
                .teamIds(List.of(teamA.getId(), teamB.getId(), teamC.getId(), teamD.getId(), teamE.getId(), teamF.getId()))
                .build());

        List<TournamentStage> poolStages = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId()).stream()
                .filter(s -> Boolean.TRUE.equals(s.getIsGroupStage()))
                .toList();
        List<Match> poolMatches = poolStages.stream()
                .flatMap(s -> matchRepository.findByStageId(s.getId()).stream())
                .toList();

        TournamentStage qfStage = stageRepository.findByTournamentIdOrderByDisplayOrderAsc(tournament.getId()).stream()
                .filter(s -> "Quarter Finals".equalsIgnoreCase(s.getName()))
                .findFirst().orElseThrow();
        List<Match> qfMatches = matchRepository.findByStageId(qfStage.getId());

        assertThat(poolMatches).isNotEmpty();
        assertThat(qfMatches).hasSize(4);

        for (Match pm : poolMatches) {
            matchService.updateMatch(pm.getId(), MatchUpdateRequest.builder()
                    .homeScore(20)
                    .awayScore(10)
                    .status(MatchStatus.COMPLETED)
                    .build(), null);
        }

        // In a 3-pool format with 6 teams (8-slot bracket: Seed 1 v 8, 2 v 7, 3 v 6, 4 v 5),
        // matches 2 (Seed 3 v 6) and 3 (Seed 4 v 5) have both teams; matches 0 and 1 have home team (Seed 1 and 2) with byes.
        // At minimum, every QF match with a valid seed must be seeded and not remain unfilled.
        int seededSlots = 0;
        for (Match qf : qfMatches) {
            Match reloaded = reloadMatch(qf.getId());
            if (reloaded.getHomeTeam() != null) seededSlots++;
            if (reloaded.getAwayTeam() != null) seededSlots++;
        }
        assertThat(seededSlots)
                .as("Expected all 6 qualifying teams to be seeded into knockout slots")
                .isEqualTo(6);
    }

    @Test
    @DisplayName("S4: Knockout-winner advancement - completes match with nextMatchIdForWinner")
    void s4_knockoutWinnerAdvancement_advancesWinnerToNextMatch() {
        Tournament tournament = createTournament("Test Cup S4", "test-cup-s4");
        Team teamA = createTeam("Test Club A", "TCA", "test-club-a-" + UUID.randomUUID());
        Team teamB = createTeam("Test Club B", "TCB", "test-club-b-" + UUID.randomUUID());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamA).isActive(true).deleted(false).build());
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament).team(teamB).isActive(true).deleted(false).build());

        TournamentStage semiStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Semi Finals")
                .stageType(TournamentStageType.SEMI_FINAL)
                .isGroupStage(false)
                .isKnockoutStage(true)
                .displayOrder(1)
                .build());

        TournamentStage finalStage = stageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Final")
                .stageType(TournamentStageType.FINAL)
                .isGroupStage(false)
                .isKnockoutStage(true)
                .displayOrder(2)
                .build());

        Match finalMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(finalStage)
                .homeTeamPlaceholder("Winner SF1")
                .awayTeamPlaceholder("Winner SF2")
                .matchCode("S4-FN-M1")
                .matchNumber(2)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.now().plusDays(1))
                .kickOffTime(LocalTime.of(15, 0))
                .build());

        Match semiMatch = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(semiStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .nextMatchIdForWinner(finalMatch.getId())
                .winnerSlot("HOME")
                .matchCode("S4-SF-M1")
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(13, 0))
                .build());

        // Complete the semi match: Team A wins
        matchService.updateMatch(semiMatch.getId(), MatchUpdateRequest.builder()
                .homeScore(25)
                .awayScore(15)
                .status(MatchStatus.COMPLETED)
                .build(), null);

        Match reloadedFinal = reloadMatch(finalMatch.getId());
        assertThat(reloadedFinal.getHomeTeam())
                .as("Winner Team A should be stored in finalMatch homeTeam")
                .isNotNull();
        assertThat(reloadedFinal.getHomeTeam().getId()).isEqualTo(teamA.getId());
    }
}
