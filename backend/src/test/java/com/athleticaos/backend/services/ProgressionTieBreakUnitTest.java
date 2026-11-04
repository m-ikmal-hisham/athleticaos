package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.DecidedBy;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.repositories.TournamentVenueRepository;
import com.athleticaos.backend.services.impl.ProgressionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class ProgressionTieBreakUnitTest {

    @Mock
    private MatchRepository matchRepository;
    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private TournamentStageRepository stageRepository;
    @Mock
    private TournamentVenueRepository venueRepository;

    private ProgressionServiceImpl progressionService;

    private Team homeTeam;
    private Team awayTeam;
    private Tournament tournament;
    private TournamentStage knockoutStage;

    @BeforeEach
    void setUp() {
        progressionService = new ProgressionServiceImpl(
                matchRepository,
                tournamentRepository,
                stageRepository,
                venueRepository
        );

        homeTeam = Team.builder().id(UUID.randomUUID()).name("Home Rugby").build();
        awayTeam = Team.builder().id(UUID.randomUUID()).name("Away Rugby").build();
        tournament = Tournament.builder().id(UUID.randomUUID()).name("Knockout Trophy").build();

        knockoutStage = new TournamentStage();
        knockoutStage.setId(UUID.randomUUID());
        knockoutStage.setName("Quarter-Finals");
        knockoutStage.setStageType(TournamentStageType.QUARTER_FINAL);
        knockoutStage.setIsKnockoutStage(true);
    }

    @Test
    @DisplayName("Level knockout match with decidedBy advances explicit winner to next match and loser to 3rd place match")
    void levelKnockoutAdvancesExplicitWinnerAndLoser() {
        UUID qfId = UUID.randomUUID();
        UUID sfId = UUID.randomUUID();
        UUID bronzeId = UUID.randomUUID();

        Match qfMatch = Match.builder()
                .id(qfId)
                .tournament(tournament)
                .stage(knockoutStage)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeScore(14)
                .awayScore(14)
                .decidedBy(DecidedBy.FIRST_TRY.name())
                .winnerTeam(homeTeam)
                .status(MatchStatus.COMPLETED)
                .nextMatchIdForWinner(sfId)
                .winnerSlot("HOME")
                .nextMatchIdForLoser(bronzeId)
                .loserSlot("AWAY")
                .build();

        Match semiFinalMatch = Match.builder()
                .id(sfId)
                .tournament(tournament)
                .stage(knockoutStage)
                .status(MatchStatus.SCHEDULED)
                .build();

        Match thirdPlaceMatch = Match.builder()
                .id(bronzeId)
                .tournament(tournament)
                .stage(knockoutStage)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(qfId)).thenReturn(Optional.of(qfMatch));
        when(matchRepository.findById(sfId)).thenReturn(Optional.of(semiFinalMatch));
        when(matchRepository.findById(bronzeId)).thenReturn(Optional.of(thirdPlaceMatch));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        progressionService.processMatchCompletion(qfId);

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository, org.mockito.Mockito.atLeast(2)).save(captor.capture());

        // Winner (homeTeam) advances to Semi-Final
        assertThat(semiFinalMatch.getHomeTeam()).isEqualTo(homeTeam);
        // Loser (awayTeam) routes to 3rd-Place match
        assertThat(thirdPlaceMatch.getAwayTeam()).isEqualTo(awayTeam);
    }

    @Test
    @DisplayName("Pool draw without onward link does not progress")
    void poolDrawDoesNotProgress() {
        TournamentStage poolStage = new TournamentStage();
        poolStage.setStageType(TournamentStageType.POOL);

        Match poolMatch = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(poolStage)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeScore(10)
                .awayScore(10)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findById(poolMatch.getId())).thenReturn(Optional.of(poolMatch));
        assertThat(progressionService.canProgress(poolMatch.getId())).isFalse();
    }

    @Test
    @DisplayName("Placement round robin draw without explicit winner does not progress")
    void placementRoundRobinDrawDoesNotProgress() {
        TournamentStage stage = new TournamentStage();
        stage.setStageType(TournamentStageType.QUARTER_FINAL);
        stage.setIsRoundRobin(true);

        Match rrMatch = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(stage)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeScore(7)
                .awayScore(7)
                .status(MatchStatus.COMPLETED)
                .build();

        when(matchRepository.findById(rrMatch.getId())).thenReturn(Optional.of(rrMatch));
        assertThat(progressionService.canProgress(rrMatch.getId())).isFalse();
    }
}
