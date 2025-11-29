package com.athleticaos.backend.dtos.stats.leaderboard;

import java.util.UUID;

public record TeamLeaderboardEntry(
        UUID teamId,
        String teamName,
        String organisationName,
        int wins,
        int triesScored,
        int tablePoints) {
}
