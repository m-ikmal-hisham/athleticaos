package com.athleticaos.backend.dtos.stats;

import java.util.UUID;

public record TournamentStatsSummaryResponse(
                UUID tournamentId,
                String tournamentName,
                int totalMatches,
                int completedMatches,
                int totalTries,
                int totalPoints,
                int totalYellowCards,
                int totalRedCards,
                int totalDoubleYellowRedCards,
                int totalStraightRedCards,
                int totalConversions,
                int totalPenalties,
                long totalTeams,
                long totalPlayers,
                long totalGoals) {
}
