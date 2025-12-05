package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.enums.CompetitionType;
import lombok.Builder;

import java.time.LocalDate;
import java.util.UUID;

@Builder
public record TournamentDashboardResponse(
        UUID id,
        String name,
        String level,
        CompetitionType competitionType,
        boolean ageGrade,
        String ageGroupLabel,
        LocalDate startDate,
        LocalDate endDate,
        String venue,
        long totalMatches,
        long completedMatches,
        long totalTeams,
        long totalPlayers,
        String status,
        TournamentStatsSummaryResponse stats) {
}
