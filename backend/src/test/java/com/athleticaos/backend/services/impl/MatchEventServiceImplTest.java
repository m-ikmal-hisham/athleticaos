package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.match.MatchEventUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Scores keyed in against a team with no lineup (CR-08) get their player attached later through
 * the event edit endpoint.
 */
@ExtendWith(MockitoExtension.class)
class MatchEventServiceImplTest {

    @Mock private MatchEventRepository matchEventRepository;
    @Mock private MatchRepository matchRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private PlayerRepository playerRepository;
    @Mock private PlayerTeamRepository playerTeamRepository;
    @Mock private TournamentPlayerRepository tournamentPlayerRepository;
    @Mock private AuditLogger auditLogger;
    @Mock private PlayerSuspensionService suspensionService;
    @Mock private MatchService matchService;
    @Mock private UserService userService;
    @Mock private MatchOfficialRepository matchOfficialRepository;

    @InjectMocks
    private MatchEventServiceImpl service;

    private Team team;
    private Match match;
    private MatchEvent teamOnlyTry;
    private Player player;

    @BeforeEach
    void setUp() {
        Tournament tournament = Tournament.builder().id(UUID.randomUUID()).name("Carnival").build();
        team = Team.builder().id(UUID.randomUUID()).name("Home XV").build();
        match = Match.builder().id(UUID.randomUUID()).tournament(tournament).homeTeam(team).build();
        teamOnlyTry = MatchEvent.builder()
                .id(UUID.randomUUID())
                .match(match)
                .team(team)
                .eventType(MatchEventType.TRY)
                .minute(12)
                .createdAt(LocalDateTime.now())
                .build();
        player = Player.builder()
                .id(UUID.randomUUID())
                .person(Person.builder().firstName("Alex").lastName("Test").build())
                .build();

        User admin = User.builder().id(UUID.randomUUID())
                .roles(Set.of(Role.builder().name("ROLE_SUPER_ADMIN").build()))
                .build();
        lenient().when(userService.getCurrentUser()).thenReturn(admin);
        lenient().when(matchEventRepository.findById(teamOnlyTry.getId())).thenReturn(Optional.of(teamOnlyTry));
        lenient().when(matchEventRepository.saveAndFlush(any(MatchEvent.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private MatchEventUpdateRequest withPlayer(UUID playerId) {
        MatchEventUpdateRequest request = new MatchEventUpdateRequest();
        request.setPlayerId(playerId);
        return request;
    }

    @Test
    void attachesARosterPlayerToATeamOnlyScore() {
        when(playerRepository.findById(player.getId())).thenReturn(Optional.of(player));
        when(playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), team.getId())).thenReturn(true);

        MatchEventResponse response = service.updateEvent(teamOnlyTry.getId(), withPlayer(player.getId()), null);

        assertThat(teamOnlyTry.getPlayer()).isSameAs(player);
        assertThat(response.getPlayerName()).isEqualTo("Alex Test");
        assertThat(teamOnlyTry.getMinute()).isEqualTo(12);
        verify(matchService).recalculateMatchScores(match.getId());
    }

    @Test
    void acceptsAPlayerOnlyInTheTournamentSquad() {
        when(playerRepository.findById(player.getId())).thenReturn(Optional.of(player));
        when(playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), team.getId())).thenReturn(false);
        when(tournamentPlayerRepository.findByTournamentIdAndTeamIdAndPlayerId(
                match.getTournament().getId(), team.getId(), player.getId()))
                .thenReturn(Optional.of(new com.athleticaos.backend.entities.TournamentPlayer()));

        service.updateEvent(teamOnlyTry.getId(), withPlayer(player.getId()), null);

        assertThat(teamOnlyTry.getPlayer()).isSameAs(player);
    }

    @Test
    void rejectsAPlayerFromAnotherTeam() {
        when(playerRepository.findById(player.getId())).thenReturn(Optional.of(player));
        when(playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), team.getId())).thenReturn(false);
        when(tournamentPlayerRepository.findByTournamentIdAndTeamIdAndPlayerId(
                match.getTournament().getId(), team.getId(), player.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateEvent(teamOnlyTry.getId(), withPlayer(player.getId()), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Alex Test is not in Home XV's roster or squad for this tournament. Add them to the squad first, then try again.");
        assertThat(teamOnlyTry.getPlayer()).isNull();
        verify(matchEventRepository, never()).saveAndFlush(any());
    }

    @Test
    void anExplicitNullTakesThePlayerOffAgain() {
        teamOnlyTry.setPlayer(player);

        service.updateEvent(teamOnlyTry.getId(), withPlayer(null), null);

        assertThat(teamOnlyTry.getPlayer()).isNull();
    }

    @Test
    void aMinuteOnlyEditLeavesThePlayerAlone() {
        teamOnlyTry.setPlayer(player);
        MatchEventUpdateRequest request = new MatchEventUpdateRequest();
        request.setMinute(15);

        service.updateEvent(teamOnlyTry.getId(), request, null);

        assertThat(teamOnlyTry.getPlayer()).isSameAs(player);
        assertThat(teamOnlyTry.getMinute()).isEqualTo(15);
        verify(playerRepository, never()).findById(any());
    }

    @Test
    void afterTheGracePeriodAnUnassignedNonAdminCannotAttachAPlayer() {
        teamOnlyTry.setCreatedAt(LocalDateTime.now().minusMinutes(30));
        User scorer = User.builder().id(UUID.randomUUID())
                .roles(Set.of(Role.builder().name("ROLE_ORG_ADMIN").build()))
                .build();
        when(userService.getCurrentUser()).thenReturn(scorer);
        when(matchOfficialRepository.findByMatchId(match.getId())).thenReturn(java.util.List.of());

        assertThatThrownBy(() -> service.updateEvent(teamOnlyTry.getId(), withPlayer(player.getId()), null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Grace period expired");
        assertThat(teamOnlyTry.getPlayer()).isNull();
    }
}
