package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.match.DecideLevelKnockoutRequest;
import com.athleticaos.backend.dtos.match.FirstTrySuggestionResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.DecidedBy;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
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
import com.athleticaos.backend.repositories.TournamentVenueRepository;
import com.athleticaos.backend.services.impl.MatchServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class MatchKnockoutTieBreakTest {

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
    @Mock
    private TournamentVenueRepository venueRepository;
    @Mock
    private PlatformTransactionManager transactionManager;
    @Mock
    private AccessScopeService accessScopeService;

    private MatchServiceImpl matchService;

    private Team homeTeam;
    private Team awayTeam;
    private Tournament tournament;
    private TournamentStage knockoutStage;

    @BeforeEach
    void setUp() {
        TransactionStatus txStatus = org.mockito.Mockito.mock(TransactionStatus.class);
        org.mockito.Mockito.lenient().when(transactionManager.getTransaction(any())).thenReturn(txStatus);
        org.mockito.Mockito.lenient().when(accessScopeService.canWriteMatch(any(UUID.class))).thenReturn(true);
        org.mockito.Mockito.lenient().when(accessScopeService.canWriteMatch(any(Match.class))).thenReturn(true);
        org.mockito.Mockito.lenient().when(accessScopeService.isTournamentInScope(any(UUID.class))).thenReturn(true);
        org.mockito.Mockito.lenient().when(accessScopeService.isTournamentInScope(any(Tournament.class))).thenReturn(true);

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
                bracketService,
                venueRepository,
                transactionManager,
                accessScopeService
        );

        homeTeam = Team.builder().id(UUID.randomUUID()).name("Home Warriors").build();
        awayTeam = Team.builder().id(UUID.randomUUID()).name("Away Titans").build();
        tournament = Tournament.builder().id(UUID.randomUUID()).name("National Cup").build();

        knockoutStage = new TournamentStage();
        knockoutStage.setId(UUID.randomUUID());
        knockoutStage.setName("Quarter-Finals");
        knockoutStage.setStageType(TournamentStageType.QUARTER_FINAL);
        knockoutStage.setIsKnockoutStage(true);
    }

    private Match createKnockoutMatch(int homeScore, int awayScore) {
        return Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .stage(knockoutStage)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeScore(homeScore)
                .awayScore(awayScore)
                .matchDate(LocalDate.now())
                .kickOffTime(LocalTime.of(15, 0))
                .status(MatchStatus.ONGOING)
                .build();
    }

    @Test
    @DisplayName("Completing a level knockout match without a decision is refused with a clear message")
    void completingLevelKnockoutWithoutDecisionIsRefused() {
        Match match = createKnockoutMatch(14, 14);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));

        assertThatThrownBy(() -> matchService.updateMatchStatus(match.getId(), "COMPLETED", new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Level knockout matches must be decided");
    }

    @Test
    @DisplayName("Editing non-score fields on an older level completed match succeeds")
    void editingNonScoreFieldsOnLevelCompletedMatchAllowed() {
        Match match = createKnockoutMatch(10, 10);
        match.setStatus(MatchStatus.COMPLETED);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        MatchUpdateRequest req = new MatchUpdateRequest();
        req.setMatchDate(LocalDate.now().plusDays(1));

        matchService.updateMatch(match.getId(), req, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());
        assertThat(captor.getValue().getMatchDate()).isEqualTo(LocalDate.now().plusDays(1));
    }

    @Test
    @DisplayName("Editing scores on a decided knockout match clears decidedBy and explicit winner")
    void editingScoresOnDecidedMatchClearsDecidedBy() {
        Match match = createKnockoutMatch(10, 10);
        match.setStatus(MatchStatus.COMPLETED);
        match.setDecidedBy(DecidedBy.FIRST_TRY.name());
        match.setWinnerTeam(homeTeam);

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        MatchUpdateRequest req = new MatchUpdateRequest();
        req.setHomeScore(15);
        req.setAwayScore(10);

        matchService.updateMatch(match.getId(), req, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());
        Match saved = captor.getValue();
        assertThat(saved.getDecidedBy()).isNull();
        assertThat(saved.getHomeScore()).isEqualTo(15);
        assertThat(saved.getAwayScore()).isEqualTo(10);
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam); // derived from 15 > 10
    }

    @Test
    @DisplayName("decideLevelKnockout FIRST_TRY marks match COMPLETED with explicit winner")
    void decideFirstTrySuccess() {
        tournament.setFormatConfigs(new java.util.ArrayList<>(List.of(
                com.athleticaos.backend.entities.TournamentFormatConfig.builder()
                        .knockoutTieBreaker("FIRST_TRY")
                        .build()
        )));
        Match match = createKnockoutMatch(7, 7);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        DecideLevelKnockoutRequest req = new DecideLevelKnockoutRequest();
        req.setMethod(DecidedBy.FIRST_TRY.name());
        req.setWinnerTeamId(homeTeam.getId());

        matchService.decideLevelKnockout(match.getId(), req, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());
        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(saved.getDecidedBy()).isEqualTo(DecidedBy.FIRST_TRY.name());
        assertThat(saved.getWinnerTeam()).isEqualTo(homeTeam);
    }

    @Test
    @DisplayName("decideLevelKnockout DROP_KICKS validates strictly higher score and does not alter match points")
    void decideDropKicksSuccess() {
        Match match = createKnockoutMatch(12, 12);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        DecideLevelKnockoutRequest req = new DecideLevelKnockoutRequest();
        req.setMethod(DecidedBy.DROP_KICKS.name());
        req.setWinnerTeamId(awayTeam.getId());
        req.setDropKicksHome(1);
        req.setDropKicksAway(2);

        matchService.decideLevelKnockout(match.getId(), req, new MockHttpServletRequest());

        ArgumentCaptor<Match> captor = ArgumentCaptor.forClass(Match.class);
        verify(matchRepository).save(captor.capture());
        Match saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(saved.getDecidedBy()).isEqualTo(DecidedBy.DROP_KICKS.name());
        assertThat(saved.getWinnerTeam()).isEqualTo(awayTeam);
        assertThat(saved.getDropKicksHome()).isEqualTo(1);
        assertThat(saved.getDropKicksAway()).isEqualTo(2);
        // Scores must remain 12-12
        assertThat(saved.getHomeScore()).isEqualTo(12);
        assertThat(saved.getAwayScore()).isEqualTo(12);
    }

    @Test
    @DisplayName("decideLevelKnockout DROP_KICKS with tied kicks is rejected")
    void decideDropKicksTiedKicksRejected() {
        Match match = createKnockoutMatch(12, 12);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));

        DecideLevelKnockoutRequest req = new DecideLevelKnockoutRequest();
        req.setMethod(DecidedBy.DROP_KICKS.name());
        req.setWinnerTeamId(homeTeam.getId());
        req.setDropKicksHome(2);
        req.setDropKicksAway(2);

        assertThatThrownBy(() -> matchService.decideLevelKnockout(match.getId(), req, new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Drop kick tallies cannot be equal");
    }

    @Test
    @DisplayName("decideLevelKnockout EXTRA_TIME requires non-level scores")
    void decideExtraTimeRequiresNonLevelScores() {
        Match match = createKnockoutMatch(10, 10);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));

        DecideLevelKnockoutRequest req = new DecideLevelKnockoutRequest();
        req.setMethod(DecidedBy.EXTRA_TIME.name());
        req.setWinnerTeamId(homeTeam.getId());

        assertThatThrownBy(() -> matchService.decideLevelKnockout(match.getId(), req, new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no longer be level");
    }

    @Test
    @DisplayName("getFirstTrySuggestion returns earliest try event")
    void getFirstTrySuggestionReturnsEarliestTry() {
        Match match = createKnockoutMatch(10, 10);
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));

        MatchEvent penalty = MatchEvent.builder()
                .match(match)
                .team(awayTeam)
                .eventType(MatchEventType.PENALTY)
                .minute(5)
                .createdAt(LocalDateTime.now().minusMinutes(20))
                .build();

        MatchEvent awayTry = MatchEvent.builder()
                .match(match)
                .team(awayTeam)
                .eventType(MatchEventType.TRY)
                .minute(15)
                .createdAt(LocalDateTime.now().minusMinutes(10))
                .build();

        MatchEvent homeTry = MatchEvent.builder()
                .match(match)
                .team(homeTeam)
                .eventType(MatchEventType.TRY)
                .minute(8)
                .createdAt(LocalDateTime.now().minusMinutes(15))
                .build();

        when(matchEventRepository.findByMatchId(match.getId())).thenReturn(List.of(penalty, awayTry, homeTry));

        FirstTrySuggestionResponse response = matchService.getFirstTrySuggestion(match.getId());
        assertThat(response.isHasTryEvents()).isTrue();
        assertThat(response.getSuggestedWinnerTeamId()).isEqualTo(homeTeam.getId());
        assertThat(response.getSuggestedWinnerTeamName()).isEqualTo("Home Warriors");
        assertThat(response.getMinute()).isEqualTo(8);
    }
}
