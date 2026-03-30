package com.athleticaos.backend.dtos.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardStatsResponse {
    private long totalPlayers;
    private double playerTrend;
    private long totalTeams;
    private double teamTrend;
    private long totalMatches;
    private double matchTrend;
    private long totalOrganisations;
    private double organisationTrend;
    private long activeTournaments;
    private long upcomingMatches;
}
