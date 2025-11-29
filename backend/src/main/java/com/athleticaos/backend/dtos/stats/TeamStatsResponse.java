package com.athleticaos.backend.dtos.stats;

import java.util.UUID;

public record TeamStatsResponse(
        UUID teamId,
        String teamName,
        String organisationName, // club/union name
        int matchesPlayed,
        int wins,
        int draws,
        int losses,
        int pointsFor,
        int pointsAgainst,
        int pointsDifference,
        int triesScored,
        int yellowCards,
        int redCards,
        int tablePoints // e.g. 4-win, 2-draw, +bonus later (configurable)
) {
}
