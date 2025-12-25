package com.athleticaos.backend.dtos.stats.leaderboard;

import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import java.util.List;

public record TournamentLeaderboardResponse(
                TournamentStatsSummaryResponse summary,
                List<PlayerLeaderboardEntry> topPlayers,
                List<TeamLeaderboardEntry> topTeams,
                List<PlayerLeaderboardEntry> topOffenders) {
}
