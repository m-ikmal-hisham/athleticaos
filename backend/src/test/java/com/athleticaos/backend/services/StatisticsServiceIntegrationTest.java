package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.LineupRole;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.impl.StatisticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
public class StatisticsServiceIntegrationTest {

        @Autowired
        private TestEntityManager entityManager;

        @Autowired
        private MatchEventRepository matchEventRepository;

        @Autowired
        private MatchLineupRepository matchLineupRepository;

        @Autowired
        private MatchRepository matchRepository;

        @Autowired
        private TournamentRepository tournamentRepository;

        @Autowired
        private TournamentFormatConfigRepository formatConfigRepository;

        // Service under test
        private StatisticsServiceImpl statisticsService;

        @BeforeEach
        public void setUp() {
                // manually inject repositories since @DataJpaTest doesn't scan services
                // Constructor order: MatchRepository, MatchEventRepository,
                // TournamentRepository, MatchLineupRepository, TournamentFormatConfigRepository
                statisticsService = new StatisticsServiceImpl(
                                matchRepository,
                                matchEventRepository,
                                tournamentRepository,
                                matchLineupRepository,
                                formatConfigRepository);
        }

        @Test
        public void getTournamentLeaderboard_ShouldCalculatePointsCorrectly() {
                // 1. Setup Data
                Organisation org = Organisation.builder().name("Test Org").slug("test-org").orgType("CLUB").build();
                entityManager.persist(org);

                Tournament tournament = Tournament.builder().name("Test Tournament").slug("test-tournament")
                                .organiserOrg(org)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusDays(7))
                                .venue("Test Venue")
                                .level("NATIONAL")
                                .build();
                entityManager.persist(tournament);

                Team team = Team.builder().name("Test Team").slug("test-team").organisation(org).category("MEN")
                                .ageGroup("SENIOR").status("ACTIVE").build();
                entityManager.persist(team);

                Person person = Person.builder()
                                .firstName("John")
                                .lastName("Doe")
                                .email("john@example.com")
                                .dob(LocalDate.of(1990, 1, 1))
                                .nationality("Country")
                                .gender("MALE")
                                .icOrPassport("123456789")
                                .build();
                entityManager.persist(person);

                Player player = Player.builder().person(person).status("ACTIVE").build();
                entityManager.persist(player);

                Match match = Match.builder()
                                .tournament(tournament)
                                .homeTeam(team)
                                .awayTeam(team) // Self match for simplicity
                                .matchDate(LocalDate.now())
                                .kickOffTime(LocalTime.of(14, 0))
                                .status(MatchStatus.COMPLETED)
                                .build();
                entityManager.persist(match);

                // 2. Add Player to Lineup (Starter)
                MatchLineup lineup = MatchLineup.builder()
                                .match(match)
                                .team(team)
                                .player(player)
                                .role(LineupRole.STARTER)
                                .isStarter(true)
                                .build();
                entityManager.persist(lineup);

                // 3. Add Scoring Events
                // Event 1: TRY (5 points)
                MatchEvent tryEvent = MatchEvent.builder()
                                .match(match)
                                .team(team)
                                .player(player) // Linked
                                .eventType(MatchEventType.TRY)
                                .minute(10)
                                .build();
                entityManager.persist(tryEvent);

                // Event 2: PENALTY (3 points)
                MatchEvent penaltyEvent = MatchEvent.builder()
                                .match(match)
                                .team(team)
                                .player(player) // Linked
                                .eventType(MatchEventType.PENALTY)
                                .minute(20)
                                .build();
                entityManager.persist(penaltyEvent);

                entityManager.flush();
                entityManager.clear();

                // 4. Act
                TournamentLeaderboardResponse response = statisticsService.getTournamentLeaderboard(tournament.getId(),
                                null);

                // 5. Assert
                assertThat(response.topPlayers()).hasSize(1);
                var playerStats = response.topPlayers().get(0);
                assertThat(playerStats.playerId()).isEqualTo(player.getId());
                assertThat(playerStats.firstName()).isEqualTo("John");
                assertThat(playerStats.totalPoints()).isEqualTo(8); // 5 + 3
                assertThat(playerStats.tries()).isEqualTo(1);
        }

        @Test
        public void getTournamentLeaderboard_ShouldSortPlayersCorrectly() {
                // Setup
                Organisation org = Organisation.builder().name("Test Org").slug("test-org-sort").orgType("CLUB")
                                .build();
                entityManager.persist(org);

                Tournament tournament = Tournament.builder().name("Sort Tournament").slug("sort-tournament")
                                .organiserOrg(org)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusDays(7))
                                .venue("Test Venue")
                                .level("NATIONAL")
                                .build();
                entityManager.persist(tournament);

                Team team = Team.builder().name("Test Team").slug("test-team-sort").organisation(org).category("MEN")
                                .ageGroup("SENIOR").status("ACTIVE").build();
                entityManager.persist(team);

                // Player 1: 5 points (1 try)
                createPlayerWithPoints(tournament, team, "Player", "One", MatchEventType.TRY);
                // Player 2: 10 points (2 tries)
                createPlayerWithPoints(tournament, team, "Player", "Two", MatchEventType.TRY,
                                MatchEventType.TRY);
                // Player 3: 3 points (1 penalty)
                createPlayerWithPoints(tournament, team, "Player", "Three", MatchEventType.PENALTY);

                entityManager.flush();
                entityManager.clear();

                // Act
                TournamentLeaderboardResponse response = statisticsService.getTournamentLeaderboard(tournament.getId(),
                                null);

                // Assert
                var players = response.topPlayers();
                assertThat(players).hasSize(3);

                // Should be P2 (10pts), P1 (5pts), P3 (3pts)
                assertThat(players.get(0).firstName()).isEqualTo("Player");
                assertThat(players.get(0).lastName()).isEqualTo("Two");
                assertThat(players.get(0).totalPoints()).isEqualTo(10);

                assertThat(players.get(1).lastName()).isEqualTo("One");
                assertThat(players.get(1).totalPoints()).isEqualTo(5);

                assertThat(players.get(2).lastName()).isEqualTo("Three");
                assertThat(players.get(2).totalPoints()).isEqualTo(3);
        }

        private Player createPlayerWithPoints(Tournament t, Team team, String fName, String lName,
                        MatchEventType... events) {
                Person person = Person.builder().firstName(fName).lastName(lName).email(fName + lName + "@test.com")
                                .dob(LocalDate.now().minusYears(20)).gender("MALE")
                                .icOrPassport("123" + fName + lName)
                                .nationality("Country")
                                .build();
                entityManager.persist(person);
                Player player = Player.builder().person(person).status("ACTIVE").build();
                entityManager.persist(player);

                Match match = Match.builder().tournament(t).homeTeam(team).awayTeam(team)
                                .matchDate(LocalDate.now()).status(MatchStatus.COMPLETED).build();
                entityManager.persist(match);

                MatchLineup lineup = MatchLineup.builder().match(match).team(team).player(player)
                                .role(LineupRole.STARTER).build();
                entityManager.persist(lineup);

                for (MatchEventType type : events) {
                        MatchEvent e = MatchEvent.builder().match(match).team(team).player(player).eventType(type)
                                        .minute(10).build();
                        entityManager.persist(e);
                }
                return player;
        }

        @Test
        public void getTournamentLeaderboard_ShouldIgnoreOrphanEvents() {
                // Setup similar to above but with null player event
                Organisation org = Organisation.builder().name("Test Org").slug("test-org-2").orgType("CLUB").build();
                entityManager.persist(org);

                Tournament tournament = Tournament.builder().name("Test Tournament 2").slug("test-tournament-2")
                                .organiserOrg(org)
                                .startDate(LocalDate.now())
                                .endDate(LocalDate.now().plusDays(7))
                                .venue("Test Venue")
                                .level("NATIONAL")
                                .build();
                entityManager.persist(tournament);

                Team team = Team.builder().name("Test Team 2").slug("test-team-2").organisation(org).category("MEN")
                                .ageGroup("SENIOR").status("ACTIVE").build();
                entityManager.persist(team);

                Match match = Match.builder()
                                .tournament(tournament)
                                .homeTeam(team)
                                .awayTeam(team)
                                .matchDate(LocalDate.now())
                                .kickOffTime(LocalTime.of(14, 0))
                                .status(MatchStatus.COMPLETED)
                                .build();
                entityManager.persist(match);

                // Event with NULL player
                MatchEvent orphanEvent = MatchEvent.builder()
                                .match(match)
                                .team(team)
                                .player(null) // Unlinked
                                .eventType(MatchEventType.TRY)
                                .minute(10)
                                .build();
                entityManager.persist(orphanEvent);

                entityManager.flush();
                entityManager.clear();

                // Act
                TournamentLeaderboardResponse response = statisticsService.getTournamentLeaderboard(tournament.getId(),
                                null);

                // Assert
                assertThat(response.topPlayers()).isEmpty(); // Should be empty as no player linked
        }
}
