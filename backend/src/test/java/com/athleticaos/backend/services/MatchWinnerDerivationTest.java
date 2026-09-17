package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchResultType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.EventRepository;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.MediaAssetRepository;
import com.athleticaos.backend.repositories.PlayerSuspensionRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import com.athleticaos.backend.services.impl.MatchServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class MatchWinnerDerivationTest {

    @Mock
    private MatchRepository matchRepository;
    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private MatchEventRepository matchEventRepository;
    @Mock
    private UserService userService;
    @Mock
    private AuditLogger auditLogger;
    @Mock
    private PlayerSuspensionService suspensionService;
    @Mock
    private MatchLineupRepository matchLineupRepository;
    @Mock
    private MatchOfficialRepository matchOfficialRepository;
    @Mock
    private PlayerSuspensionRepository playerSuspensionRepository;
    @Mock
    private MediaAssetRepository mediaAssetRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private StatisticsService statisticsService;
    @Mock
    private TournamentStageRepository stageRepository;
    @Mock
    private ProgressionService progressionService;
    @Mock
    private BracketService bracketService;

    private MatchServiceImpl matchService;

    private Team homeTeam;
    private Team awayTeam;
    private Tournament tournament;

    @BeforeEach
    void setUp() {
        matchService = new MatchServiceImpl(
                matchRepository,
                tournamentRepository,
                teamRepository,
                matchEventRepository,
                userService,
                auditLogger,
                suspensionService,
                matchLineupRepository,
                matchOfficialRepository,
                playerSuspensionRepository,
                mediaAssetRepository,
                eventRepository,
                statisticsService,
                stageRepository,
                progressionService,
                bracketService
        );

        homeTeam = Team.builder().id(UUID.randomUUID()).name("Home Team").build();
        awayTeam = Team.builder().id(UUID.randomUUID()).name("Away Team").build();
        tournament = Tournament.builder().id(UUID.randomUUID()).name("Championship").build();
    }

    private Match createBaseMatch() {
        return Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(14, 0))
                .status(MatchStatus.SCHEDULED)
                .build();
    }

    @Test
    @DisplayName("updateMatchStatus to COMPLETED with home win derives NORMAL resultType and homeTeam winner")
    void updateMatchStatus_HomeWin_DerivesNormalAndHomeTeam() {
        Match match = createBaseMatch();
        match.setHomeScore(24);
        match.setAwayScore(12);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        matchService.updateMatchStatus(match.getId(), "COMPLETED", new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam);
    }

    @Test
    @DisplayName("updateMatchStatus to COMPLETED with away win derives NORMAL resultType and awayTeam winner")
    void updateMatchStatus_AwayWin_DerivesNormalAndAwayTeam() {
        Match match = createBaseMatch();
        match.setHomeScore(15);
        match.setAwayScore(28);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        matchService.updateMatchStatus(match.getId(), "COMPLETED", new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(saved.getWinnerTeam()).isEqualTo(awayTeam);
    }

    @Test
    @DisplayName("updateMatchStatus to COMPLETED with equal scores derives NORMAL resultType and null winner")
    void updateMatchStatus_Draw_DerivesNormalAndNullWinner() {
        Match match = createBaseMatch();
        match.setHomeScore(20);
        match.setAwayScore(20);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        matchService.updateMatchStatus(match.getId(), "COMPLETED", new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(saved.getWinnerTeam()).isNull();
    }

    @Test
    @DisplayName("updateMatch moving match from COMPLETED to SCHEDULED clears winner and resultType")
    void updateMatch_MovedOutOfCompleted_ClearsWinnerAndResultType() {
        Match match = createBaseMatch();
        match.setStatus(MatchStatus.COMPLETED);
        match.setHomeScore(20);
        match.setAwayScore(10);
        match.setResultType(MatchResultType.NORMAL);
        match.setWinnerTeam(homeTeam);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchUpdateRequest request = new MatchUpdateRequest();
        request.setStatus(MatchStatus.SCHEDULED);

        matchService.updateMatch(match.getId(), request, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.SCHEDULED);
        assertThat(saved.getResultType()).isNull();
        assertThat(saved.getWinnerTeam()).isNull();
    }

    @Test
    @DisplayName("WALKOVER matches preserve their resultType and winnerTeam when updated")
    void updateMatch_WalkoverPreserved() {
        Match match = createBaseMatch();
        match.setStatus(MatchStatus.COMPLETED);
        match.setResultType(MatchResultType.WALKOVER);
        match.setWinnerTeam(homeTeam);
        match.setHomeScore(28);
        match.setAwayScore(0);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchUpdateRequest request = new MatchUpdateRequest();
        request.setHomeScore(30);

        matchService.updateMatch(match.getId(), request, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.WALKOVER);
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam);
    }

    @Test
    @DisplayName("BYE matches preserve their resultType and winnerTeam when updated")
    void updateMatch_ByePreserved() {
        Match match = createBaseMatch();
        match.setStatus(MatchStatus.COMPLETED);
        match.setResultType(MatchResultType.BYE);
        match.setWinnerTeam(homeTeam);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        matchService.updateMatchStatus(match.getId(), "COMPLETED", new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.BYE);
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam);
    }

    @Test
    @DisplayName("recalculateMatchScores derives winner when match is completed")
    void recalculateMatchScores_CompletedMatch_DerivesWinner() {
        Match match = createBaseMatch();
        match.setStatus(MatchStatus.COMPLETED);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchEvent tryEvent = MatchEvent.builder()
                .match(match)
                .team(homeTeam)
                .eventType(MatchEventType.TRY)
                .build();
        when(matchEventRepository.findByMatchId(match.getId())).thenReturn(List.of(tryEvent));
        when(statisticsService.getPointsForEventType(MatchEventType.TRY)).thenReturn(5);

        matchService.recalculateMatchScores(match.getId());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());

        Match saved = captor.getValue();
        assertThat(saved.getHomeScore()).isEqualTo(5);
        assertThat(saved.getAwayScore()).isEqualTo(0);
        assertThat(saved.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam);
    }
}
