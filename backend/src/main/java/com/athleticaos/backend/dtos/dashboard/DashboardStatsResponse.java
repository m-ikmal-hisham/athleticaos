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
    private long totalTeams;
    private long totalMatches;
    private long totalOrganisations;
    private long activeTournaments;
    private long upcomingMatches;
}
