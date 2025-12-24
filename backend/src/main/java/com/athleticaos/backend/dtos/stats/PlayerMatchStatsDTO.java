package com.athleticaos.backend.dtos.stats;

import java.time.LocalDate;
import java.util.UUID;

public record PlayerMatchStatsDTO(
        UUID matchId,
        LocalDate matchDate,
        String opponentName,
        String result, // e.g. "W 24-12", "L 10-15"
        int tries,
        int points,
        int yellowCards,
        int redCards,
        String minutesPlayed // e.g. "80", "20 (Sub)"
) {
}
