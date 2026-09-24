package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.dashboard.DashboardStatsResponse;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.services.DashboardService;
import com.athleticaos.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardServiceImpl implements DashboardService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final OrganisationRepository organisationRepository;
    private final TournamentRepository tournamentRepository;
    private final PlayerTeamRepository playerTeamRepository;
    private final UserService userService;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        log.info("Fetching dashboard statistics");

        // null means unrestricted (SUPER_ADMIN); otherwise the user's organisation and its descendants
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();

        long totalPlayers;
        long totalTeams;
        long totalMatches;
        long totalOrganisations;
        long activeTournaments;
        long upcomingMatches;

        if (accessibleOrgIds == null) {
            totalPlayers = playerRepository.countByDeletedFalse();
            totalTeams = teamRepository.countByStatus("Active");
            totalMatches = matchRepository.count();
            totalOrganisations = organisationRepository.count();
            activeTournaments = tournamentRepository.countByStatusAndDeletedFalse(TournamentStatus.LIVE);
            upcomingMatches = matchRepository.countByStatus(MatchStatus.SCHEDULED);
        } else if (accessibleOrgIds.isEmpty()) {
            totalPlayers = 0;
            totalTeams = 0;
            totalMatches = 0;
            totalOrganisations = 0;
            activeTournaments = 0;
            upcomingMatches = 0;
        } else {
            totalPlayers = playerTeamRepository.countPlayersByOrganisationIds(accessibleOrgIds);
            totalTeams = teamRepository.countByStatusAndOrganisation_IdIn("Active", accessibleOrgIds);
            totalMatches = matchRepository.countInOrganisations(accessibleOrgIds);
            totalOrganisations = accessibleOrgIds.size();
            activeTournaments = tournamentRepository
                    .countByStatusAndDeletedFalseAndOrganiserOrg_IdIn(TournamentStatus.LIVE, accessibleOrgIds);
            upcomingMatches = matchRepository.countByStatusInOrganisations(MatchStatus.SCHEDULED, accessibleOrgIds);
        }

        return DashboardStatsResponse.builder()
                .totalPlayers(totalPlayers)
                .playerTrend(5.2)
                .totalTeams(totalTeams)
                .teamTrend(2.1)
                .totalMatches(totalMatches)
                .matchTrend(-1.5)
                .totalOrganisations(totalOrganisations)
                .organisationTrend(0.5)
                .activeTournaments(activeTournaments)
                .upcomingMatches(upcomingMatches)
                .build();
    }
}
