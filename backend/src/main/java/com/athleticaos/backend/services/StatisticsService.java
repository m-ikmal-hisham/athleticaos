package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.stats.PlayerStatsResponse;
import com.athleticaos.backend.dtos.stats.TeamStatsResponse;
import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;

import java.util.List;
import java.util.UUID;

public interface StatisticsService {

    TournamentStatsSummaryResponse getTournamentSummary(UUID tournamentId);

    List<PlayerStatsResponse> getPlayerStatsForTournament(UUID tournamentId);

    List<TeamStatsResponse> getTeamStatsForTournament(UUID tournamentId);

    TournamentLeaderboardResponse getTournamentLeaderboard(UUID tournamentId);

    PlayerStatsResponse getPlayerStatsAcrossTournaments(UUID playerId);

    TeamStatsResponse getTeamStatsAcrossTournaments(UUID teamId);
}
