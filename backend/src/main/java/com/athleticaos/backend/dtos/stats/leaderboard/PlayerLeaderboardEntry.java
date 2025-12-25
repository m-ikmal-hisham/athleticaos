package com.athleticaos.backend.dtos.stats.leaderboard;

import java.util.UUID;

public record PlayerLeaderboardEntry(
                UUID playerId,
                String firstName,
                String lastName,
                String teamName,
                int tries,
                int totalPoints,
                int yellowCards,
                int redCards) {
}
