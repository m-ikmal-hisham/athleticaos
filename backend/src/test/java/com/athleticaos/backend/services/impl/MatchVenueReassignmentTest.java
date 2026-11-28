package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.entities.TournamentVenue;
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
import com.athleticaos.backend.repositories.TournamentVenueRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.BracketService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.ProgressionService;
import com.athleticaos.backend.services.StatisticsService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class MatchVenueReassignmentTest {

    @Mock private MatchRepository matchRepository;
    @Mock private TournamentRepository tournamentRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private MatchEventRepository matchEventRepository;
    @Mock private UserService userService;
    @Mock private AuditLogger auditLogger;
    @Mock private PlayerSuspensionService suspensionService;
    @Mock private MatchLineupRepository matchLineupRepository;
    @Mock private MatchOfficialRepository matchOfficialRepository;
    @Mock private PlayerSuspensionRepository playerSuspensionRepository;
    @Mock private MediaAssetRepository mediaAssetRepository;
    @Mock private EventRepository eventRepository;
    @Mock private StatisticsService statisticsService;
    @Mock private TournamentStageRepository stageRepository;
    @Mock private ProgressionService progressionService;
    @Mock private BracketService bracketService;
    @Mock private TournamentVenueRepository venueRepository;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private AccessScopeService accessScopeService;
    @Mock private EntityManager entityManager;

    private MatchServiceImpl matchService;
    private Tournament tournament;
    private TournamentVenue venueA;
    private TournamentVenue venueB;

    @BeforeEach
    void setUp() {
        TransactionStatus txStatus = mock(TransactionStatus.class);
        lenient().when(transactionManager.getTransaction(any())).thenReturn(txStatus);
        lenient().when(accessScopeService.isTournamentInScope(any(Tournament.class))).thenReturn(true);
        lenient().when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(entityManager.contains(any())).thenReturn(true);

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
        matchService.setEntityManager(entityManager);

        tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Synthetic Cup")
                .slug("synthetic-cup")
                .build();
        venueA = TournamentVenue.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Field A")
                .displayOrder(0)
                .build();
        venueB = TournamentVenue.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .name("Field B")
                .displayOrder(1)
                .build();
    }

    @Test
    @DisplayName("Moving to a venue where matchNumber is occupied locks tournament, refreshes match, and allocates max+1 before mutating")
    void moveWithCollisionLocksRefreshesAndAllocatesNextNumber() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(1)
                .matchCode("SYN-M1")
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 15))
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueB.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueB));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.isMatchNumberOccupied(tournament.getId(), venueB.getId(), 1, match.getId()))
                .thenAnswer(inv -> {
                    // Assert entity venue has NOT been mutated before occupancy query
                    assertThat(match.getVenueId()).isEqualTo(venueA.getId());
                    assertThat(match.getMatchNumber()).isEqualTo(1);
                    return true;
                });
        when(matchRepository.findMaxMatchNumber(tournament.getId(), venueB.getId())).thenReturn(4);

        MatchUpdateRequest req = MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build();

        MatchResponse response = matchService.updateMatch(match.getId(), req, new MockHttpServletRequest());

        assertThat(response.getVenueId()).isEqualTo(venueB.getId());
        assertThat(response.getVenue()).isEqualTo("Field B");
        assertThat(response.getMatchNumber()).isEqualTo(5);
        assertThat(response.getMatchCode()).isEqualTo("SYN-M1");
        assertThat(response.getMatchDate()).isEqualTo(LocalDate.of(2026, 11, 28));
        assertThat(response.getKickOffTime()).isEqualTo(LocalTime.of(9, 15));

        InOrder order = inOrder(tournamentRepository, entityManager, matchRepository);
        order.verify(tournamentRepository).findByIdForUpdate(tournament.getId());
        order.verify(entityManager).refresh(match);
        order.verify(matchRepository).isMatchNumberOccupied(tournament.getId(), venueB.getId(), 1, match.getId());
        order.verify(matchRepository).findMaxMatchNumber(tournament.getId(), venueB.getId());
        order.verify(matchRepository).save(match);
    }

    @Test
    @DisplayName("Moving to a venue where current matchNumber is free preserves matchNumber")
    void moveToFreeNumberPreservesMatchNumber() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(3)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueB.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueB));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.isMatchNumberOccupied(tournament.getId(), venueB.getId(), 3, match.getId()))
                .thenReturn(false);

        MatchUpdateRequest req = MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build();

        MatchResponse response = matchService.updateMatch(match.getId(), req, new MockHttpServletRequest());

        assertThat(response.getVenueId()).isEqualTo(venueB.getId());
        assertThat(response.getMatchNumber()).isEqualTo(3);
        verify(matchRepository, never()).findMaxMatchNumber(any(), any());
    }

    @Test
    @DisplayName("Genuine move allocates destination number when matchNumber is currently null")
    void moveWithNullMatchNumberAllocatesDestinationNumber() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(null)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueB.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueB));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.findMaxMatchNumber(tournament.getId(), venueB.getId())).thenReturn(2);

        MatchUpdateRequest req = MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build();

        MatchResponse response = matchService.updateMatch(match.getId(), req, new MockHttpServletRequest());

        assertThat(response.getVenueId()).isEqualTo(venueB.getId());
        assertThat(response.getMatchNumber()).isEqualTo(3);
    }

    @Test
    @DisplayName("Stale match refreshed under lock uses updated matchNumber for destination check")
    void staleMatchRefreshedUnderLockUsesLatestMatchNumber() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueB.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueB));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        doAnswer(inv -> {
            // Simulate concurrent renumber changing matchNumber from 1 to 2 before we got the lock
            match.setMatchNumber(2);
            return null;
        }).when(entityManager).refresh(match);
        when(matchRepository.isMatchNumberOccupied(tournament.getId(), venueB.getId(), 2, match.getId()))
                .thenReturn(false);

        MatchResponse response = matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venueId(venueB.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        assertThat(response.getMatchNumber()).isEqualTo(2);
        verify(matchRepository).isMatchNumberOccupied(tournament.getId(), venueB.getId(), 2, match.getId());
    }

    @Test
    void sameVenueSubmissionRefreshesRenumberedMatch() {
        Match match = Match.builder().id(UUID.randomUUID()).tournament(tournament)
                .tournamentVenue(venueA).venue("Field A").matchNumber(1)
                .status(MatchStatus.SCHEDULED).build();
        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueA.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueA));
        lenient().when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        lenient().doAnswer(inv -> { match.setMatchNumber(2); return null; }).when(entityManager).refresh(match);

        MatchResponse response = matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId()).venueIdSet(true).build(), new MockHttpServletRequest());

        assertThat(response.getMatchNumber()).isEqualTo(2);
        verify(entityManager).refresh(match);
        verify(matchRepository, never()).findMaxMatchNumber(any(), any());
    }

    @Test
    @DisplayName("Same-venue submission refreshes under lock without allocating a different number")
    void sameVenueNoOpLeavesMatchNumberUnchanged() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(null)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueA.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueA));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));

        MatchResponse response = matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venueId(venueA.getId())
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        assertThat(response.getVenueId()).isEqualTo(venueA.getId());
        assertThat(response.getMatchNumber()).isNull();
        verify(tournamentRepository).findByIdForUpdate(tournament.getId());
        verify(entityManager).refresh(match);
        verify(matchRepository, never()).findMaxMatchNumber(any(), any());
    }

    @Test
    @DisplayName("Explicit clear via zero UUID or blank legacy venue checks unassigned scope and allocates on collision")
    void explicitClearAllocatesInUnassignedScopeOnCollision() {
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(1)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.isMatchNumberOccupied(tournament.getId(), null, 1, match.getId()))
                .thenReturn(true);
        when(matchRepository.findMaxMatchNumber(tournament.getId(), null)).thenReturn(6);

        MatchResponse response = matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venueId(new UUID(0L, 0L))
                .venueIdSet(true)
                .build(), new MockHttpServletRequest());

        assertThat(response.getVenueId()).isNull();
        assertThat(response.getVenue()).isNull();
        assertThat(response.getMatchNumber()).isEqualTo(7);
    }

    @Test
    @DisplayName("Invalid venue rejects without mutating match or saving")
    void invalidVenueRejectsBeforeMutation() {
        UUID unknownVenueId = UUID.randomUUID();
        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(1)
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(10, 0))
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(unknownVenueId, tournament.getId()))
                .thenReturn(Optional.empty());

        MatchUpdateRequest req = MatchUpdateRequest.builder()
                .venueId(unknownVenueId)
                .venueIdSet(true)
                .matchDate(LocalDate.of(2026, 12, 1))
                .build();

        assertThatThrownBy(() -> matchService.updateMatch(match.getId(), req, new MockHttpServletRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Venue does not belong to this tournament");

        assertThat(match.getVenueId()).isEqualTo(venueA.getId());
        assertThat(match.getMatchNumber()).isEqualTo(1);
        assertThat(match.getMatchDate()).isEqualTo(LocalDate.of(2026, 11, 28));
        verify(matchRepository, never()).save(any());
        verify(tournamentRepository, never()).findByIdForUpdate(any());
    }

    @Test
    @DisplayName("Venue-only update preserves unrelated fields (date, kickoff, scores, result, status, teams, category, code, links)")
    void venueOnlyUpdatePreservesAllUnrelatedFields() {
        Team home = Team.builder().id(UUID.randomUUID()).name("Home Club").build();
        Team away = Team.builder().id(UUID.randomUUID()).name("Away Club").build();
        TournamentCategory category = TournamentCategory.builder().id(UUID.randomUUID()).name("U15").build();
        TournamentStage stage = TournamentStage.builder().id(UUID.randomUUID()).name("Pool A").category(category).build();
        UUID nextWinnerId = UUID.randomUUID();
        UUID nextLoserId = UUID.randomUUID();

        Match match = Match.builder()
                .id(UUID.randomUUID())
                .tournament(tournament)
                .category(category)
                .stage(stage)
                .homeTeam(home)
                .awayTeam(away)
                .tournamentVenue(venueA)
                .venue("Field A")
                .matchNumber(1)
                .matchCode("SYN-U15-01")
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(14, 30))
                .homeScore(21)
                .awayScore(14)
                .status(MatchStatus.COMPLETED)
                .resultType(MatchResultType.NORMAL)
                .winnerTeam(home)
                .nextMatchIdForWinner(nextWinnerId)
                .winnerSlot("HOME")
                .nextMatchIdForLoser(nextLoserId)
                .loserSlot("AWAY")
                .build();

        when(matchRepository.findById(match.getId())).thenReturn(Optional.of(match));
        when(venueRepository.findByTournamentIdAndDeletedFalseOrderByDisplayOrderAscNameAsc(tournament.getId()))
                .thenReturn(List.of(venueA, venueB));
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.isMatchNumberOccupied(tournament.getId(), venueB.getId(), 1, match.getId()))
                .thenReturn(true);
        when(matchRepository.findMaxMatchNumber(tournament.getId(), venueB.getId())).thenReturn(1);

        MatchResponse response = matchService.updateMatch(match.getId(), MatchUpdateRequest.builder()
                .venue("field b")
                .build(), new MockHttpServletRequest());

        assertThat(response.getVenueId()).isEqualTo(venueB.getId());
        assertThat(response.getVenue()).isEqualTo("Field B");
        assertThat(response.getMatchNumber()).isEqualTo(2);
        assertThat(match.getMatchDate()).isEqualTo(LocalDate.of(2026, 11, 28));
        assertThat(match.getKickOffTime()).isEqualTo(LocalTime.of(14, 30));
        assertThat(match.getHomeScore()).isEqualTo(21);
        assertThat(match.getAwayScore()).isEqualTo(14);
        assertThat(match.getStatus()).isEqualTo(MatchStatus.COMPLETED);
        assertThat(match.getResultType()).isEqualTo(MatchResultType.NORMAL);
        assertThat(match.getWinnerTeam()).isSameAs(home);
        assertThat(match.getHomeTeam()).isSameAs(home);
        assertThat(match.getAwayTeam()).isSameAs(away);
        assertThat(match.getCategory()).isSameAs(category);
        assertThat(match.getMatchCode()).isEqualTo("SYN-U15-01");
        assertThat(match.getNextMatchIdForWinner()).isEqualTo(nextWinnerId);
        assertThat(match.getWinnerSlot()).isEqualTo("HOME");
        assertThat(match.getNextMatchIdForLoser()).isEqualTo(nextLoserId);
        assertThat(match.getLoserSlot()).isEqualTo("AWAY");
    }

    @Test
    @DisplayName("createMatch locks tournament before computing findMaxMatchNumber")
    void createMatchLocksTournamentFirst() {
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(venueRepository.findByIdAndTournamentIdAndDeletedFalse(venueA.getId(), tournament.getId()))
                .thenReturn(Optional.of(venueA));
        when(matchRepository.findMaxMatchNumber(tournament.getId(), venueA.getId())).thenReturn(3);

        MatchResponse created = matchService.createMatch(MatchCreateRequest.builder()
                .tournamentId(tournament.getId())
                .venueId(venueA.getId())
                .matchDate(LocalDate.of(2026, 11, 28))
                .kickOffTime(LocalTime.of(9, 0))
                .build(), new MockHttpServletRequest());

        assertThat(created.getMatchNumber()).isEqualTo(4);
        InOrder order = inOrder(tournamentRepository, matchRepository);
        order.verify(tournamentRepository).findByIdForUpdate(tournament.getId());
        order.verify(matchRepository).findMaxMatchNumber(tournament.getId(), venueA.getId());
    }

    @Test
    @DisplayName("renumberMatches locks tournament before loading matches when dryRun=false, and skips lock on dryRun=true")
    void renumberMatchesLocksBeforeLoadingMatchesWhenExecuting() {
        when(tournamentRepository.findByIdForUpdate(tournament.getId())).thenReturn(Optional.of(tournament));
        when(tournamentRepository.findById(tournament.getId())).thenReturn(Optional.of(tournament));
        when(matchRepository.findByTournamentId(tournament.getId())).thenReturn(List.of());
        when(venueRepository.findByTournamentIdAndDeletedFalseOrderByDisplayOrderAscNameAsc(tournament.getId()))
                .thenReturn(List.of());

        matchService.renumberMatches(tournament.getId(), false, new MockHttpServletRequest());
        InOrder order = inOrder(tournamentRepository, matchRepository);
        order.verify(tournamentRepository).findByIdForUpdate(tournament.getId());
        order.verify(matchRepository).findByTournamentId(tournament.getId());

        matchService.renumberMatches(tournament.getId(), true, new MockHttpServletRequest());
        verify(tournamentRepository).findById(tournament.getId());
    }
}
