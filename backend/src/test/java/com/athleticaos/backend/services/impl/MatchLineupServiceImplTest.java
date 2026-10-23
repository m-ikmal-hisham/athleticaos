package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO;
import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.LineupRole;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchLineupServiceImplTest {

    @Mock
    private MatchLineupRepository matchLineupRepository;

    @Mock
    private MatchRepository matchRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private com.athleticaos.backend.repositories.TournamentPlayerRepository tournamentPlayerRepository;

    @Mock
    private com.athleticaos.backend.services.AccessScopeService accessScopeService;

    @InjectMocks
    private MatchLineupServiceImpl matchLineupService;

    private UUID matchId;
    private UUID teamId;
    private Team team;

    @BeforeEach
    void setUp() {
        matchId = UUID.randomUUID();
        teamId = UUID.randomUUID();
        team = Team.builder().id(teamId).name("Test Team").build();
        org.mockito.Mockito.lenient().when(accessScopeService.canWriteMatch(any(UUID.class))).thenReturn(true);
        org.mockito.Mockito.lenient().when(accessScopeService.canWriteMatch(any(com.athleticaos.backend.entities.Match.class))).thenReturn(true);
    }

    private MatchLineupEntryDTO createEntry(UUID playerId, boolean isStarter, LineupRole role) {
        return MatchLineupEntryDTO.builder()
                .playerId(playerId)
                .isStarter(isStarter)
                .role(role)
                .jerseyNumber(1)
                .build();
    }

    @Test
    @DisplayName("Tens category config: 10 starters and 5 bench allowed, rejects 11 starters")
    void tensCategory_rejectsMoreThan10Starters() {
        TournamentCategory category = TournamentCategory.builder()
                .id(UUID.randomUUID())
                .name("Men's Tens")
                .build();

        TournamentFormatConfig tensConfig = TournamentFormatConfig.builder()
                .id(UUID.randomUUID())
                .category(category)
                .startersCount(10)
                .maxBenchCount(5)
                .build();

        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tens Tournament")
                .categories(new ArrayList<>(List.of(category)))
                .formatConfigs(new ArrayList<>(List.of(tensConfig)))
                .build();

        TournamentStage stage = TournamentStage.builder()
                .id(UUID.randomUUID())
                .name("Pool A")
                .category(category)
                .build();

        Match match = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .stage(stage)
                .homeTeam(team)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        List<MatchLineupEntryDTO> entries = new ArrayList<>();
        // 11 starters
        for (int i = 0; i < 11; i++) {
            entries.add(createEntry(UUID.randomUUID(), true, LineupRole.STARTER));
        }

        MatchLineupUpdateRequest request = MatchLineupUpdateRequest.builder()
                .teamId(teamId)
                .entries(entries)
                .build();

        assertThatThrownBy(() -> matchLineupService.updateLineup(matchId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Too many starters: 11. Maximum allowed is 10");
    }

    @Test
    @DisplayName("Tens category config: rejects bench players exceeding maxBenchCount")
    void tensCategory_rejectsExcessBenchPlayers() {
        TournamentCategory category = TournamentCategory.builder()
                .id(UUID.randomUUID())
                .name("Men's Tens")
                .build();

        TournamentFormatConfig tensConfig = TournamentFormatConfig.builder()
                .id(UUID.randomUUID())
                .category(category)
                .startersCount(10)
                .maxBenchCount(5)
                .build();

        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("Tens Tournament")
                .categories(new ArrayList<>(List.of(category)))
                .formatConfigs(new ArrayList<>(List.of(tensConfig)))
                .build();

        Match match = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .category(category)
                .homeTeam(team)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        List<MatchLineupEntryDTO> entries = new ArrayList<>();
        // 10 starters
        for (int i = 0; i < 10; i++) {
            entries.add(createEntry(UUID.randomUUID(), true, LineupRole.STARTER));
        }
        // 6 bench players (limit is 5)
        for (int i = 0; i < 6; i++) {
            entries.add(createEntry(UUID.randomUUID(), false, LineupRole.BENCH));
        }

        MatchLineupUpdateRequest request = MatchLineupUpdateRequest.builder()
                .teamId(teamId)
                .entries(entries)
                .build();

        assertThatThrownBy(() -> matchLineupService.updateLineup(matchId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Too many bench players: 6. Maximum allowed is 5");
    }

    @Test
    @DisplayName("Default XV config: allows up to 15 starters and 10 bench, rejects 16 starters")
    void defaultXV_rejectsMoreThan15Starters() {
        Tournament tournament = Tournament.builder()
                .id(UUID.randomUUID())
                .name("XV Tournament")
                .build();

        Match match = Match.builder()
                .id(matchId)
                .tournament(tournament)
                .homeTeam(team)
                .status(MatchStatus.SCHEDULED)
                .build();

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(team));

        List<MatchLineupEntryDTO> entries = new ArrayList<>();
        for (int i = 0; i < 16; i++) {
            entries.add(createEntry(UUID.randomUUID(), true, LineupRole.STARTER));
        }

        MatchLineupUpdateRequest request = MatchLineupUpdateRequest.builder()
                .teamId(teamId)
                .entries(entries)
                .build();

        assertThatThrownBy(() -> matchLineupService.updateLineup(matchId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Too many starters: 16. Maximum allowed is 15");
    }
}
