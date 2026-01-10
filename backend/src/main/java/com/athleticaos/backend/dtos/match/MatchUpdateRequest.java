package com.athleticaos.backend.dtos.match;

import com.athleticaos.backend.enums.MatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MatchUpdateRequest {
    private LocalDate matchDate;
    private LocalTime kickOffTime;
    private String venue;
    private String pitch;
    private String phase;
    private String matchCode;
    private MatchStatus status;
    private Integer homeScore;
    private Integer awayScore;
    private java.util.UUID homeTeamId;
    private java.util.UUID awayTeamId;
    private String homeTeamPlaceholder;
    private String awayTeamPlaceholder;
}
