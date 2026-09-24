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
    private java.util.UUID venueId;
    @Builder.Default
    private boolean venueIdSet = false;

    public void setVenueId(java.util.UUID venueId) {
        this.venueId = venueId;
        this.venueIdSet = true;
    }

    private String venue;
    private String pitch;
    /** null leaves it unchanged; an empty string clears it. */
    private String livestreamUrl;
    private String phase;
    private String matchCode;
    private MatchStatus status;
    private Integer homeScore;
    private Integer awayScore;
    private java.util.UUID homeTeamId;
    private java.util.UUID awayTeamId;
    private java.util.UUID stageId;
    private String homeTeamPlaceholder;
    private String awayTeamPlaceholder;

    private java.util.UUID homeFromWinnerOfMatchId;
    private java.util.UUID homeFromLoserOfMatchId;
    private java.util.UUID awayFromWinnerOfMatchId;
    private java.util.UUID awayFromLoserOfMatchId;
}
