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
    private String tournamentName;
    private String tournamentSlug;
    private UUID homeTeamId;
    private UUID homeTeamOrgId;
    private String homeTeamName;
    private UUID awayTeamId;
    private UUID awayTeamOrgId;
    private String awayTeamName;
    private String homeTeamLogoUrl;
    private String homeTeamShortName;
    private String awayTeamLogoUrl;
    private String awayTeamShortName;
    private LocalDate matchDate;
    private LocalTime kickOffTime;
    private String venue;
    private String pitch;
    private String status;
    private Integer homeScore;
    private Integer awayScore;
    private String phase;
    private String matchCode;
    private StageInfo stage;

    private TeamInfo homeTeam;
    private TeamInfo awayTeam;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StageInfo {
        private String id;
        private String name;
        private String stageType;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TeamInfo {
        private UUID id;
        private String name;
        private UUID orgId;
    }
}
