package com.athleticaos.backend.dtos.stats;

import java.util.UUID;

public record PlayerStatsResponse(
                UUID playerId,
                String firstName,
                String lastName,
                String teamName, // nullable if not linked
                int matchesPlayed,
                int tries,
                int conversions,
                int penalties,
                int dropGoals,
                int yellowCards,
                int redCards,
                int totalPoints, // e.g. try=5, conv=2, penalty=3, drop=3
                java.util.List<PlayerMatchStatsDTO> recentMatches) {
}
