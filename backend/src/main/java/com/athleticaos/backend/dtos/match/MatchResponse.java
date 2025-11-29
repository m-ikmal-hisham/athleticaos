package com.athleticaos.backend.dtos.match;

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
public class MatchResponse {
    private UUID id;
    private UUID tournamentId;
    private UUID homeTeamId;
    private String homeTeamName;
    private UUID awayTeamId;
    private String awayTeamName;
    private LocalDate matchDate;
    private LocalTime kickOffTime;
    private String venue;
    private String pitch;
    private String status;
    private Integer homeScore;
    private Integer awayScore;
    private String phase;
    private String matchCode;
}
