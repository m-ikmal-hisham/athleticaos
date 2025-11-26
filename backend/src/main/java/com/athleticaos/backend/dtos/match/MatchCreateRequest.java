package com.athleticaos.backend.dtos.match;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    private String fieldNumber;
}
