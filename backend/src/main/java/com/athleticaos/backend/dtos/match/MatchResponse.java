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
    private String homeTeamPlaceholder;
    private String awayTeamPlaceholder;
    private LocalDate matchDate;
    private LocalTime kickOffTime;
    private String venue;
    private String pitch;
    private String status;
    private Integer homeScore;
    private Integer awayScore;
    /** NORMAL, WALKOVER or BYE. Null means a normally played match. */
    private String resultType;
    /** Set only for walkovers and byes, which have no scores to derive a winner from. */
    private UUID winnerTeamId;
    private String phase;
    private String matchCode;
    /** Sequential number within the tournament (1, 2, 3, …) for easy identification. */
    private Integer matchNumber;
    private StageInfo stage;

    private java.util.UUID homeFromWinnerOfMatchId;
    private java.util.UUID homeFromLoserOfMatchId;
    private java.util.UUID awayFromWinnerOfMatchId;
    private java.util.UUID awayFromLoserOfMatchId;

    private TeamInfo homeTeam;
    private TeamInfo awayTeam;

    // Lineup configuration from tournament format
    private Integer startersCount;
    private Integer maxBenchCount;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StageInfo {
        private String id;
        private String name;
        private String stageType;
        private UUID categoryId;
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
