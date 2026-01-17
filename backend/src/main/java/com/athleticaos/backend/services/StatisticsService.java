package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.stats.PlayerStatsResponse;
import com.athleticaos.backend.dtos.stats.TeamStatsResponse;
import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;

import java.util.List;
import java.util.UUID;

public interface StatisticsService {

    TournamentStatsSummaryResponse getTournamentSummary(UUID tournamentId, UUID categoryId);

    List<PlayerStatsResponse> getPlayerStatsForTournament(UUID tournamentId, UUID categoryId);

    List<TeamStatsResponse> getTeamStatsForTournament(UUID tournamentId, UUID categoryId);

    TournamentLeaderboardResponse getTournamentLeaderboard(UUID tournamentId, UUID categoryId);

    PlayerStatsResponse getPlayerStatsAcrossTournaments(UUID playerId);

    TeamStatsResponse getTeamStatsAcrossTournaments(UUID teamId);
}
