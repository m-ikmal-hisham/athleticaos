package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.tournament.PlacementStandingRowResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.MatchResultType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentFormatConfigRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class PlacementRoundRobinStandingsTest {

    private MatchRepository matchRepository;
    private TournamentTeamRepository tournamentTeamRepository;
    private TournamentFormatConfigRepository formatConfigRepository;
    private MatchEventRepository matchEventRepository;
    private TournamentStageRepository stageRepository;
    private StandingsServiceImpl standingsService;

    private Tournament tournament;
    private TournamentStage roundRobinStage;

    @BeforeEach
    void setUp() {
        matchRepository = Mockito.mock(MatchRepository.class);
        tournamentTeamRepository = Mockito.mock(TournamentTeamRepository.class);
        formatConfigRepository = Mockito.mock(TournamentFormatConfigRepository.class);
        matchEventRepository = Mockito.mock(MatchEventRepository.class);
        stageRepository = Mockito.mock(TournamentStageRepository.class);

        standingsService = new StandingsServiceImpl(
                matchRepository,
                tournamentTeamRepository,
                formatConfigRepository,
                matchEventRepository,
                stageRepository
        );

        tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("National Sevens")
                .build();

        roundRobinStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("13th to 15th Place")
                .stageType(TournamentStageType.CLASSIFICATION)
                .isRoundRobin(true)
                .isGroupStage(false)
                .isKnockoutStage(false)
                .firstPlace(13)
                .build();

        // Default scoring config: Win=4, Draw=2, Loss=0
        TournamentFormatConfig globalConfig = TournamentFormatConfig.builder()
                .pointsWin(4)
                .pointsDraw(2)
                .pointsLoss(0)
                .bonusPointsEnabled(false)
                .build();

        when(formatConfigRepository.findByTournamentIdAndCategoryIsNull(tournament.getId()))
                .thenReturn(Optional.of(globalConfig));
        when(matchEventRepository.findScoringEventCountsByTournamentId(tournament.getId()))
                .thenReturn(Collections.emptyList());
    }

    @Test
    @DisplayName("Table order: sorted by points, diff, pointsFor and assigns final places 13, 14, 15")
    void tableOrder_assignsCorrectPlaces() {
        Team teamA = Team.builder().id(UUID.randomUUID()).name("Alpha").build();
        Team teamB = Team.builder().id(UUID.randomUUID()).name("Beta").build();
        Team teamC = Team.builder().id(UUID.randomUUID()).name("Gamma").build();

        // Team A beats Team B: 20 - 10 (A gets 4 pts, B gets 0)
        Match m1 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .homeScore(20)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        // Team A beats Team C: 15 - 5 (A gets 4 pts, C gets 0)
        Match m2 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamA)
                .awayTeam(teamC)
                .homeScore(15)
                .awayScore(5)
                .status(MatchStatus.COMPLETED)
                .build();

        // Team B beats Team C: 25 - 10 (B gets 4 pts, C gets 0)
        Match m3 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamB)
                .awayTeam(teamC)
                .homeScore(25)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findByStageId(roundRobinStage.getId())).thenReturn(List.of(m1, m2, m3));

        List<PlacementStandingRowResponse> table = standingsService.calculatePlacementRoundRobinTable(roundRobinStage);

        assertEquals(3, table.size());

        // 1st in RR = 13th place overall (Team A: 8 pts, PD +20)
        assertEquals(13, table.get(0).getPlace());
        assertEquals("Alpha", table.get(0).getTeamName());
        assertEquals(2, table.get(0).getPlayed());
        assertEquals(2, table.get(0).getWon());
        assertEquals(8, table.get(0).getPoints());
        assertEquals(20, table.get(0).getPointsDiff());

        // 2nd in RR = 14th place overall (Team B: 4 pts, PD +5)
        assertEquals(14, table.get(1).getPlace());
        assertEquals("Beta", table.get(1).getTeamName());
        assertEquals(2, table.get(1).getPlayed());
        assertEquals(1, table.get(1).getWon());
        assertEquals(1, table.get(1).getLost());
        assertEquals(4, table.get(1).getPoints());
        assertEquals(5, table.get(1).getPointsDiff());

        // 3rd in RR = 15th place overall (Team C: 0 pts, PD -25)
        assertEquals(15, table.get(2).getPlace());
        assertEquals("Gamma", table.get(2).getTeamName());
        assertEquals(2, table.get(2).getPlayed());
        assertEquals(0, table.get(2).getWon());
        assertEquals(2, table.get(2).getLost());
        assertEquals(0, table.get(2).getPoints());
        assertEquals(-25, table.get(2).getPointsDiff());
    }

    @Test
    @DisplayName("Three-way tie: cycle where all have equal points is broken by points difference then points for")
    void threeWayTie_brokenByPointDifferential() {
        Team teamA = Team.builder().id(UUID.randomUUID()).name("Alpha").build();
        Team teamB = Team.builder().id(UUID.randomUUID()).name("Beta").build();
        Team teamC = Team.builder().id(UUID.randomUUID()).name("Gamma").build();

        // Team A beats Team B by 15: 25 - 10
        Match m1 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .homeScore(25)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        // Team B beats Team C by 10: 20 - 10
        Match m2 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamB)
                .awayTeam(teamC)
                .homeScore(20)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        // Team C beats Team A by 5: 15 - 10
        Match m3 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamC)
                .awayTeam(teamA)
                .homeScore(15)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findByStageId(roundRobinStage.getId())).thenReturn(List.of(m1, m2, m3));

        List<PlacementStandingRowResponse> table = standingsService.calculatePlacementRoundRobinTable(roundRobinStage);

        assertEquals(3, table.size());
        // All teams won 1, lost 1 -> 4 points each
        assertEquals(4, table.get(0).getPoints());
        assertEquals(4, table.get(1).getPoints());
        assertEquals(4, table.get(2).getPoints());

        // Alpha: PF=35, PA=25, Diff=+10 -> 13th place
        assertEquals("Alpha", table.get(0).getTeamName());
        assertEquals(13, table.get(0).getPlace());
        assertEquals(10, table.get(0).getPointsDiff());

        // Beta: PF=30, PA=35, Diff=-5 -> 14th place
        assertEquals("Beta", table.get(1).getTeamName());
        assertEquals(14, table.get(1).getPlace());
        assertEquals(-5, table.get(1).getPointsDiff());

        // Gamma: PF=25, PA=30, Diff=-5, PF=25 (less than Beta's 30) -> 15th place
        assertEquals("Gamma", table.get(2).getTeamName());
        assertEquals(15, table.get(2).getPlace());
        assertEquals(-5, table.get(2).getPointsDiff());
    }

    @Test
    @DisplayName("Walkover: awards 4 table points, 0 loss points, 0 bonus points")
    void walkover_awardsCorrectPoints() {
        Team teamA = Team.builder().id(UUID.randomUUID()).name("Alpha").build();
        Team teamB = Team.builder().id(UUID.randomUUID()).name("Beta").build();

        Match m1 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .resultType(MatchResultType.WALKOVER)
                .winnerTeam(teamA)
                .homeScore(28)
                .awayScore(0)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findByStageId(roundRobinStage.getId())).thenReturn(List.of(m1));

        List<PlacementStandingRowResponse> table = standingsService.calculatePlacementRoundRobinTable(roundRobinStage);

        assertEquals(2, table.size());
        // Alpha won by walkover: 4 points, 28-0
        assertEquals(13, table.get(0).getPlace());
        assertEquals("Alpha", table.get(0).getTeamName());
        assertEquals(1, table.get(0).getWon());
        assertEquals(4, table.get(0).getPoints());
        assertEquals(0, table.get(0).getBonusPoints());

        // Beta lost by walkover: 0 points
        assertEquals(14, table.get(1).getPlace());
        assertEquals("Beta", table.get(1).getTeamName());
        assertEquals(1, table.get(1).getLost());
        assertEquals(0, table.get(1).getPoints());
    }

    @Test
    @DisplayName("Draw: draw stands with 2 points each and no winner progression")
    void draw_standsWithEqualPoints() {
        Team teamA = Team.builder().id(UUID.randomUUID()).name("Alpha").build();
        Team teamB = Team.builder().id(UUID.randomUUID()).name("Beta").build();

        Match m1 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .homeScore(14)
                .awayScore(14)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findByStageId(roundRobinStage.getId())).thenReturn(List.of(m1));

        List<PlacementStandingRowResponse> table = standingsService.calculatePlacementRoundRobinTable(roundRobinStage);

        assertEquals(2, table.size());
        assertEquals(1, table.get(0).getDrawn());
        assertEquals(1, table.get(1).getDrawn());
        assertEquals(2, table.get(0).getPoints());
        assertEquals(2, table.get(1).getPoints());
    }

    @Test
    @DisplayName("Unfilled slots: placeholders show with 0 played and preserve first_place offsets")
    void unfilledSlots_showPlaceholders() {
        Match m1 = Match.builder()
                .id(UUID.randomUUID())
                .stage(roundRobinStage)
                .homeTeamPlaceholder("Rank 13")
                .awayTeamPlaceholder("Rank 14")
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findByStageId(roundRobinStage.getId())).thenReturn(List.of(m1));

        List<PlacementStandingRowResponse> table = standingsService.calculatePlacementRoundRobinTable(roundRobinStage);

        assertEquals(2, table.size());
        assertEquals(13, table.get(0).getPlace());
        assertEquals("Rank 13", table.get(0).getPlaceholder());
        assertEquals(0, table.get(0).getPlayed());

        assertEquals(14, table.get(1).getPlace());
        assertEquals("Rank 14", table.get(1).getPlaceholder());
        assertEquals(0, table.get(1).getPlayed());
    }
}
