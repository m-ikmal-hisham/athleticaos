package com.athleticaos.backend.dtos.season;

import com.athleticaos.backend.enums.SeasonLevel;
import com.athleticaos.backend.enums.SeasonStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.util.UUID;

@Builder
public record SeasonOverviewResponse(
        UUID id,
        String name,
        String code,
        SeasonLevel level,
        SeasonStatus status,
        LocalDate startDate,
        LocalDate endDate,
        long totalTournaments,
        long totalMatches,
        long completedMatches,
        long totalTeams,
        long totalPlayers) {
}
