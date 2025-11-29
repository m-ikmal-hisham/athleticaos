package com.athleticaos.backend.dtos.match;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MatchCreateRequest {
    @NotNull(message = "Tournament ID is required")
    private UUID tournamentId;

    @NotNull(message = "Home Team ID is required")
    private UUID homeTeamId;

    @NotNull(message = "Away Team ID is required")
    private UUID awayTeamId;

    @NotNull(message = "Match date is required")
    private LocalDate matchDate;

    @NotNull(message = "Kick-off time is required")
    private LocalTime kickOffTime;

    private String venue;
    private String pitch;
    private String phase;
    private String matchCode;
}
