package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
import java.util.List;
import com.athleticaos.backend.dtos.official.MatchOfficialDTO;

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
    /** NORMAL, WALKOVER or BYE. Null means a normally played match. */
    private String resultType;
    private String stage;
    /**
     * The stage's type (PLATE, BOWL, SHIELD, ...). Needed so the public bracket groups a match
     * the same way the organiser's view does — grouping on the stage *name* alone misfiles any
     * bracket the organiser renamed, e.g. a Shield bracket called "Development".
     */
    private String stageType;
    private Integer stageDisplayOrder;
    private String round;
    private List<MatchOfficialDTO> officials;
}
