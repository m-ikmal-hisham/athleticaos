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

    private UUID homeTeamId;
    private UUID awayTeamId;
    private UUID stageId;

    private String homeTeamPlaceholder;
    private String awayTeamPlaceholder;

    @NotNull(message = "Match date is required")
    private LocalDate matchDate;

    @NotNull(message = "Kick-off time is required")
    private LocalTime kickOffTime;

    private String venue;
    private String pitch;
    private String phase;
    private String matchCode;

    private java.util.UUID homeFromWinnerOfMatchId;
    private java.util.UUID homeFromLoserOfMatchId;
    private java.util.UUID awayFromWinnerOfMatchId;
    private java.util.UUID awayFromLoserOfMatchId;
}
