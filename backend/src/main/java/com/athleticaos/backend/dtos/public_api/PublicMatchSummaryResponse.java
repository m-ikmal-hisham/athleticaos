package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class PublicMatchSummaryResponse {
    private UUID id;
    private String code;
    private String homeTeamName;
    private String awayTeamName;
    private String homeTeamLogoUrl;
    private String awayTeamLogoUrl;
    private String homeTeamShortName;
    private String awayTeamShortName;
    private Integer homeScore;
    private Integer awayScore;
    private LocalDate matchDate;
    private LocalTime matchTime;
    private String venue;
    private String status; // SCHEDULED, LIVE, FULL_TIME, CANCELLED
    private String stage;
    private String round;
}
