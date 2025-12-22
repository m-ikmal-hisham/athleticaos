package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.dashboard.DashboardStatsResponse;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardServiceImpl implements DashboardService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final OrganisationRepository organisationRepository;
    private final TournamentRepository tournamentRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        log.info("Fetching dashboard statistics");

        long totalPlayers = playerRepository.count();
        long totalTeams = teamRepository.count();
        long totalMatches = matchRepository.count();
        long totalOrganisations = organisationRepository.count();

        // Count active tournaments (LIVE status)
        long activeTournaments = tournamentRepository
                .countByStatus(com.athleticaos.backend.enums.TournamentStatus.LIVE);

        // Count upcoming matches (scheduled status)
        long upcomingMatches = matchRepository.countByStatus(MatchStatus.SCHEDULED);

        return DashboardStatsResponse.builder()
                .totalPlayers(totalPlayers)
                .totalTeams(totalTeams)
                .totalMatches(totalMatches)
                .totalOrganisations(totalOrganisations)
                .activeTournaments(activeTournaments)
                .upcomingMatches(upcomingMatches)
                .build();
    }
}
