package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.dashboard.DashboardStatsResponse;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private OrganisationRepository organisationRepository;
    @Mock
    private TournamentRepository tournamentRepository;
    @Mock
    private PlayerTeamRepository playerTeamRepository;
    @Mock
    private UserService userService;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    void superAdminSeesGlobalCounts() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(null);
        when(playerRepository.countByDeletedFalse()).thenReturn(500L);
        when(teamRepository.countByStatus("Active")).thenReturn(80L);
        when(matchRepository.count()).thenReturn(300L);
        when(organisationRepository.count()).thenReturn(207L);
        when(tournamentRepository.countByStatusAndDeletedFalse(TournamentStatus.LIVE)).thenReturn(1L);
        when(matchRepository.countByStatus(MatchStatus.SCHEDULED)).thenReturn(66L);

        DashboardStatsResponse stats = dashboardService.getDashboardStats();

        assertThat(stats.getTotalPlayers()).isEqualTo(500L);
        assertThat(stats.getTotalOrganisations()).isEqualTo(207L);
        assertThat(stats.getUpcomingMatches()).isEqualTo(66L);
        verify(playerTeamRepository, never()).countPlayersByOrganisationIds(any());
    }

    @Test
    void scopedUserSeesOnlyTheirOrganisationTree() {
        Set<UUID> orgIds = Set.of(UUID.randomUUID(), UUID.randomUUID());
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(orgIds);
        when(playerTeamRepository.countPlayersByOrganisationIds(orgIds)).thenReturn(40L);
        when(teamRepository.countByStatusAndOrganisation_IdIn("Active", orgIds)).thenReturn(3L);
        when(matchRepository.countInOrganisations(orgIds)).thenReturn(12L);
        when(tournamentRepository.countByStatusAndDeletedFalseAndOrganiserOrg_IdIn(TournamentStatus.LIVE, orgIds))
                .thenReturn(1L);
        when(matchRepository.countByStatusInOrganisations(MatchStatus.SCHEDULED, orgIds)).thenReturn(5L);

        DashboardStatsResponse stats = dashboardService.getDashboardStats();

        assertThat(stats.getTotalPlayers()).isEqualTo(40L);
        assertThat(stats.getTotalTeams()).isEqualTo(3L);
        assertThat(stats.getTotalMatches()).isEqualTo(12L);
        assertThat(stats.getTotalOrganisations()).isEqualTo(2L);
        assertThat(stats.getActiveTournaments()).isEqualTo(1L);
        assertThat(stats.getUpcomingMatches()).isEqualTo(5L);
        verify(playerRepository, never()).countByDeletedFalse();
        verify(organisationRepository, never()).count();
        verify(teamRepository, never()).countByStatus(anyString());
    }

    @Test
    void userWithoutOrganisationSeesZeroes() {
        when(userService.getAccessibleOrgIdsForCurrentUser()).thenReturn(Collections.emptySet());

        DashboardStatsResponse stats = dashboardService.getDashboardStats();

        assertThat(stats.getTotalPlayers()).isZero();
        assertThat(stats.getTotalOrganisations()).isZero();
        assertThat(stats.getUpcomingMatches()).isZero();
        verifyNoInteractions(playerRepository, teamRepository, matchRepository,
                organisationRepository, tournamentRepository, playerTeamRepository);
    }
}
