package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.impl.MatchServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
public class MatchAutoProgressionSecurityRegressionTest {

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

    private UUID tournamentId;
    private UUID matchId;
    private UUID nextMatchId;
    private Match feederMatch;
    private Tournament tournament;
    private Team homeTeam;
    private Team awayTeam;

    @BeforeEach
    void setUp() {
        TransactionStatus txStatus = mock(TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(txStatus);

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

        tournamentId = UUID.randomUUID();
        matchId = UUID.randomUUID();
        nextMatchId = UUID.randomUUID();

        tournament = Tournament.builder()
                .id(tournamentId)
                .name("Inter-Org Championship")
                .build();

        homeTeam = Team.builder().id(UUID.randomUUID()).name("Team Red").build();
        awayTeam = Team.builder().id(UUID.randomUUID()).name("Team Blue").build();

        TournamentStage knockoutStage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .name("Semi-Finals")
                .isKnockoutStage(true)
                .build();

        feederMatch = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .stage(knockoutStage)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .homeScore(24)
                .awayScore(12)
                .status(MatchStatus.LIVE)
                .nextMatchIdForWinner(nextMatchId)
                .build();
    }

    @Test
    @DisplayName("C4: Assigned official outside org scope can complete match and auto-progression triggers downstream without scope check")
    void assignedOfficialCompletesMatch_autoProgressionTriggersDownstreamProgression() {
        when(matchRepository.findById(matchId)).thenReturn(Optional.of(feederMatch));
        when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

        // Assigned official has write scope to this match (even though tournament is NOT in caller's org scope)
        when(accessScopeService.canWriteMatch(feederMatch)).thenReturn(true);

        TransactionSynchronizationManager.initSynchronization();
        try {
            MatchResponse response = matchService.updateMatchStatus(matchId, "COMPLETED", new MockHttpServletRequest());

            assertThat(response.getStatus()).isEqualTo("COMPLETED");
            assertThat(feederMatch.getStatus()).isEqualTo(MatchStatus.COMPLETED);
            assertThat(feederMatch.getWinnerTeam()).isEqualTo(homeTeam);

            // Execute the registered afterCommit synchronization callback
            List<TransactionSynchronization> synchronizations = TransactionSynchronizationManager.getSynchronizations();
            assertThat(synchronizations).isNotEmpty();
            for (TransactionSynchronization sync : synchronizations) {
                sync.afterCommit();
            }

            // Verify auto-progression executed and called progressionService.processMatchCompletion
            verify(progressionService).processMatchCompletion(matchId);

            // Verify accessScopeService is never called for downstream system auto-progression (C3)
            verify(accessScopeService, never()).canWriteMatch(nextMatchId);
            verify(accessScopeService, never()).isTournamentInScope(tournament);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("F-5/A6: updateMatchStatus on M2 by caller who cannot write M2 throws EntityNotFoundException and status unchanged")
    void updateMatchStatus_whenCallerCannotWriteMatch_throwsEntityNotFoundException_andStatusUnchanged() {
        when(matchRepository.findById(matchId)).thenReturn(Optional.of(feederMatch));
        when(accessScopeService.canWriteMatch(feederMatch)).thenReturn(false);

        feederMatch.setStatus(MatchStatus.SCHEDULED);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                matchService.updateMatchStatus(matchId, "COMPLETED", new MockHttpServletRequest())
        ).isInstanceOf(jakarta.persistence.EntityNotFoundException.class)
         .hasMessageContaining("Match not found");

        assertThat(feederMatch.getStatus()).isEqualTo(MatchStatus.SCHEDULED);
        verify(matchRepository, never()).save(any());
        verify(progressionService, never()).processMatchCompletion(any());
    }
}
