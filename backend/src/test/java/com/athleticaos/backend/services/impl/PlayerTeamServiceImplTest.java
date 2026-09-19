package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.services.AccessScopeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PlayerTeamServiceImplTest {

    @Mock
    private PlayerTeamRepository playerTeamRepository;
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private MatchLineupRepository matchLineupRepository;
    @Mock
    private MatchEventRepository matchEventRepository;
    @Mock
    private TournamentPlayerRepository tournamentPlayerRepository;
    @Mock
    private AccessScopeService accessScopeService;

    @InjectMocks
    private PlayerTeamServiceImpl playerTeamService;

    private UUID teamId;
    private Team team;

    @BeforeEach
    void setUp() {
        teamId = UUID.randomUUID();
        Organisation org = Organisation.builder().id(UUID.randomUUID()).name("Test Org").build();
        team = Team.builder().id(teamId).name("Test Team").organisation(org).build();
    }

    @Test
    void getTeamRosterInScope_whenInScope_returnsRoster() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);

        Person person = new Person();
        person.setId(UUID.randomUUID());
        person.setFirstName("Player");
        person.setLastName("One");
        person.setEmail("person.a@example.test");

        Player player = Player.builder().id(UUID.randomUUID()).person(person).build();
        PlayerTeam pt = PlayerTeam.builder().id(UUID.randomUUID()).team(team).player(player).isActive(true).build();
        when(playerTeamRepository.findActiveRosterByTeamId(teamId)).thenReturn(List.of(pt));

        List<PlayerInTeamDTO> roster = playerTeamService.getTeamRosterInScope(teamId, null);

        assertThat(roster).hasSize(1);
        assertThat(roster.get(0).getEmail()).isEqualTo("person.a@example.test");
    }

    @Test
    void getTeamRosterInScope_whenOutOfScope_returnsEmptyList() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(false);
        when(accessScopeService.getCurrentUserId()).thenReturn(UUID.randomUUID());

        List<PlayerInTeamDTO> roster = playerTeamService.getTeamRosterInScope(teamId, null);

        assertThat(roster).isEmpty();
        verify(playerTeamRepository, never()).findActiveRosterByTeamId(any());
    }

    @Test
    void getTeamRosterInScope_whenTeamNotFound_returnsEmptyList() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.empty());

        List<PlayerInTeamDTO> roster = playerTeamService.getTeamRosterInScope(teamId, null);

        assertThat(roster).isEmpty();
        verify(playerTeamRepository, never()).findActiveRosterByTeamId(any());
    }

    @Test
    void getTeamRosterInScope_whenSuperAdmin_returnsRoster() {
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));
        when(accessScopeService.isTeamInScope(team)).thenReturn(true);
        when(playerTeamRepository.findActiveRosterByTeamId(teamId)).thenReturn(Collections.emptyList());

        List<PlayerInTeamDTO> roster = playerTeamService.getTeamRosterInScope(teamId, null);

        assertThat(roster).isNotNull();
    }
}
