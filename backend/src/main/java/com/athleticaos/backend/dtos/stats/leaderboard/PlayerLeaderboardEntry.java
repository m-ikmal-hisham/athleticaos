package com.athleticaos.backend.dtos.stats.leaderboard;

import java.util.UUID;

public record PlayerLeaderboardEntry(
                UUID playerId,
                String firstName,
                String lastName,
                String teamName,
                int tries,
                int conversions,
                int penalties,
                int totalPoints,
                int yellowCards,
                int redCards) {
}
