package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.dtos.tournament.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.support.IntegrationTestUsers;
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
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Placement round robin on a real database: two pools of three, a "4th to 6th place" round robin
 * filled from "Rank 4" to "Rank 6", slot changes, results, and the pool tables left untouched.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class PlacementRoundRobinIntegrationTest {

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

    @Autowired private OrganisationRepository organisationRepository;
    @Autowired private TournamentRepository tournamentRepository;
    @Autowired private TournamentCategoryRepository categoryRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TournamentTeamRepository tournamentTeamRepository;
    @Autowired private TournamentStageRepository stageRepository;
    @Autowired private MatchRepository matchRepository;
    @Autowired private BracketService bracketService;
    @Autowired private StandingsService standingsService;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private EntityManager entityManager;

    private Organisation org;
    private TransactionTemplate tx;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        tx = new TransactionTemplate(transactionManager);
        org = organisationRepository.findBySlug("placement-rr-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("Placement RR Org")
                        .orgType("CLUB")
                        .slug("placement-rr-org")
                        .build()));
    }

    private Team team(String name) {
        String slug = name.toLowerCase(Locale.ROOT).replace(' ', '-') + "-" + UUID.randomUUID();
        return teamRepository.saveAndFlush(Team.builder()
                .name(name)
                .shortName(name.substring(0, 3).toUpperCase(Locale.ROOT))
                .slug(slug)
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("SELANGOR")
                .build());
    }

    private void poolMatch(Tournament t, TournamentCategory c, TournamentStage pool, Team home, Team away,
            int homeScore, int awayScore, int number) {
        matchRepository.saveAndFlush(Match.builder()
                .tournament(t)
                .category(c)
                .stage(pool)
                .homeTeam(home)
                .awayTeam(away)
                .homeScore(homeScore)
                .awayScore(awayScore)
                .winnerTeam(homeScore > awayScore ? home : (awayScore > homeScore ? away : null))
                .matchCode("PRR-M" + number)
                .matchNumber(number)
                .status(MatchStatus.COMPLETED)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(9, 0).plusMinutes(20L * number))
                .build());
    }

    private Map<UUID, Integer> poolPoints(UUID tournamentId) {
        return standingsService.getStandings(tournamentId).stream()
                .collect(Collectors.toMap(StandingsResponse::getTeamId, StandingsResponse::getPoints));
    }

    private Set<UUID> teamsIn(UUID stageId) {
        entityManager.clear();
        Set<UUID> ids = new HashSet<>();
        for (Match m : matchRepository.findByStageId(stageId)) {
            if (m.getHomeTeam() != null) ids.add(m.getHomeTeam().getId());
            if (m.getAwayTeam() != null) ids.add(m.getAwayTeam().getId());
        }
        return ids;
    }

    @Test
    @DisplayName("Placement round robin: fills from Rank n, own table, slot changes guarded, pool tables unchanged, delete when no results")
    void placementRoundRobinLifecycle() {
        // Two pools of three. Pool A: A1 > A2 > A3. Pool B: B1 > B2 > B3.
        // Overall ranking is pool position first: 1-2 winners, 3-4 runners-up, 5-6 thirds.
        Map<String, Team> teams = new LinkedHashMap<>();
        UUID[] ids = tx.execute(status -> {
            Tournament t = tournamentRepository.saveAndFlush(Tournament.builder()
                    .name("Placement RR Cup")
                    .slug("placement-rr-cup-" + UUID.randomUUID())
                    .level("NATIONAL")
                    .venue("Test Stadium")
                    .isPublished(true)
                    .status(TournamentStatus.PUBLISHED)
                    .organiserOrg(org)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(2))
                    .build());
            TournamentCategory men = categoryRepository.saveAndFlush(TournamentCategory.builder()
                    .tournament(t)
                    .name("Men")
                    .build());

            TournamentStage poolA = stageRepository.saveAndFlush(TournamentStage.builder()
                    .tournament(t).category(men).name("Pool A")
                    .stageType(TournamentStageType.POOL).isGroupStage(true).isKnockoutStage(false)
                    .displayOrder(1).build());
            TournamentStage poolB = stageRepository.saveAndFlush(TournamentStage.builder()
                    .tournament(t).category(men).name("Pool B")
                    .stageType(TournamentStageType.POOL).isGroupStage(true).isKnockoutStage(false)
                    .displayOrder(2).build());

            for (String n : List.of("A1", "A2", "A3", "B1", "B2", "B3")) {
                Team team = team("Team " + n);
                teams.put(n, team);
                tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                        .tournament(t).category(men).team(team)
                        .poolNumber(n.startsWith("A") ? "Pool A" : "Pool B")
                        .isActive(true).deleted(false).build());
            }

            poolMatch(t, men, poolA, teams.get("A1"), teams.get("A2"), 20, 10, 1);
            poolMatch(t, men, poolA, teams.get("A1"), teams.get("A3"), 30, 0, 2);
            poolMatch(t, men, poolA, teams.get("A2"), teams.get("A3"), 15, 5, 3);
            poolMatch(t, men, poolB, teams.get("B1"), teams.get("B2"), 25, 5, 4);
            poolMatch(t, men, poolB, teams.get("B1"), teams.get("B3"), 35, 0, 5);
            poolMatch(t, men, poolB, teams.get("B2"), teams.get("B3"), 12, 7, 6);
            return new UUID[] { t.getId(), men.getId() };
        });
        UUID tournamentId = ids[0];
        UUID categoryId = ids[1];
        Map<UUID, Integer> poolPointsBefore = poolPoints(tournamentId);

        // 1. Create "4th to 6th place" from Rank 4 to Rank 6: one runner-up and both thirds.
        TournamentStage stage = tx.execute(status -> bracketService.createPlacementRoundRobin(tournamentId,
                PlacementRoundRobinCreateRequest.builder()
                        .name("4th to 6th place")
                        .firstPlace(4)
                        .teamCount(3)
                        .categoryId(categoryId)
                        .slots(List.of(
                                PlacementRoundRobinCreateRequest.SlotSource.builder().placeholder("Rank 4").build(),
                                PlacementRoundRobinCreateRequest.SlotSource.builder().placeholder("Rank 5").build(),
                                PlacementRoundRobinCreateRequest.SlotSource.builder().placeholder("Rank 6").build()))
                        .build(),
                null));
        assertThat(stage.getIsRoundRobin()).isTrue();
        assertThat(stage.getIsGroupStage()).isFalse();
        assertThat(matchRepository.findByStageId(stage.getId())).hasSize(3);

        // Pools are complete, so the slots fill at once: both thirds (ranks 5 and 6) and the
        // lower-ranked runner-up (rank 4). Which runner-up is rank 4 is the seeding code's call.
        Set<UUID> filled = teamsIn(stage.getId());
        assertThat(filled).hasSize(3)
                .contains(teams.get("A3").getId(), teams.get("B3").getId())
                .containsAnyOf(teams.get("A2").getId(), teams.get("B2").getId());
        UUID runnerUpIn = filled.contains(teams.get("A2").getId()) ? teams.get("A2").getId() : teams.get("B2").getId();
        UUID runnerUpOut = runnerUpIn.equals(teams.get("A2").getId()) ? teams.get("B2").getId() : teams.get("A2").getId();

        // 2. Changing a slot to a team that is already in the round robin is refused.
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> bracketService.changePlacementRoundRobinSlot(
                tournamentId, stage.getId(),
                PlacementRoundRobinSlotChangeRequest.builder()
                        .oldTeamId(teams.get("A3").getId()).newTeamId(teams.get("B3").getId()).build(),
                null)))
                .isInstanceOf(IllegalArgumentException.class);

        // 3. Replace the runner-up with the other runner-up (Ragbi Online changing who plays).
        tx.executeWithoutResult(status -> bracketService.changePlacementRoundRobinSlot(
                tournamentId, stage.getId(),
                PlacementRoundRobinSlotChangeRequest.builder()
                        .oldTeamId(runnerUpIn).newTeamId(runnerUpOut).build(),
                null));
        assertThat(teamsIn(stage.getId())).contains(runnerUpOut).doesNotContain(runnerUpIn);

        // 4. Swap two slots: same three teams afterwards.
        tx.executeWithoutResult(status -> bracketService.swapPlacementRoundRobinSlots(
                tournamentId, stage.getId(),
                PlacementRoundRobinSlotSwapRequest.builder()
                        .teamId1(teams.get("A3").getId()).teamId2(teams.get("B3").getId()).build(),
                null));
        assertThat(teamsIn(stage.getId())).containsExactlyInAnyOrder(
                runnerUpOut, teams.get("A3").getId(), teams.get("B3").getId());

        // 5. Results, including a draw: the round robin has its own table, places 4 to 6.
        tx.executeWithoutResult(status -> {
            for (Match m : matchRepository.findByStageId(stage.getId())) {
                UUID h = m.getHomeTeam().getId();
                UUID a = m.getAwayTeam().getId();
                boolean runnerUpHome = h.equals(runnerUpOut);
                boolean runnerUpAway = a.equals(runnerUpOut);
                if (runnerUpHome || runnerUpAway) {
                    m.setHomeScore(runnerUpHome ? 21 : 7);
                    m.setAwayScore(runnerUpHome ? 7 : 21);
                    m.setWinnerTeam(runnerUpHome ? m.getHomeTeam() : m.getAwayTeam());
                } else {
                    m.setHomeScore(12);
                    m.setAwayScore(12);
                    m.setWinnerTeam(null);
                }
                m.setStatus(MatchStatus.COMPLETED);
                matchRepository.save(m);
            }
        });
        List<PlacementStandingRowResponse> table = tx.execute(status ->
                standingsService.calculatePlacementRoundRobinTable(stageRepository.findById(stage.getId()).orElseThrow()));
        assertThat(table).extracting(PlacementStandingRowResponse::getPlace).containsExactly(4, 5, 6);
        assertThat(table.get(0).getTeamId()).isEqualTo(runnerUpOut);
        assertThat(table.get(0).getWon()).isEqualTo(2);
        assertThat(table.get(1).getDrawn()).isEqualTo(1);
        assertThat(table.get(2).getDrawn()).isEqualTo(1);

        // 6. Pool tables and points are exactly as before the round robin was played.
        assertThat(poolPoints(tournamentId)).isEqualTo(poolPointsBefore);

        // 7. With results recorded, slot changes and delete are refused (409).
        assertThatThrownBy(() -> bracketService.swapPlacementRoundRobinSlots(tournamentId, stage.getId(),
                PlacementRoundRobinSlotSwapRequest.builder()
                        .teamId1(teams.get("A3").getId()).teamId2(teams.get("B3").getId()).build(),
                null))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> bracketService.deletePlacementRoundRobinStage(tournamentId, stage.getId(), null))
                .isInstanceOf(ResponseStatusException.class);

        // 8. Once results are cleared, the stage and its matches can be deleted.
        tx.executeWithoutResult(status -> {
            for (Match m : matchRepository.findByStageId(stage.getId())) {
                m.setStatus(MatchStatus.SCHEDULED);
                m.setHomeScore(null);
                m.setAwayScore(null);
                m.setWinnerTeam(null);
                m.setResultType(null);
                matchRepository.save(m);
            }
        });
        tx.executeWithoutResult(status -> bracketService.deletePlacementRoundRobinStage(tournamentId, stage.getId(), null));
        assertThat(stageRepository.findById(stage.getId())).isEmpty();
        assertThat(matchRepository.findByStageId(stage.getId())).isEmpty();
        assertThat(poolPoints(tournamentId)).isEqualTo(poolPointsBefore);
    }
}
