package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentPlayerDTO {
    private UUID id;
    private UUID playerId;
    private String playerName;
    /** The number actually in effect, whichever layer it came from. */
    private String playerNumber;
    /** Set only when this tournament overrides the club number; null means inherited. */
    private Integer tournamentJerseyNumber;
    /** The player's club-level default, shown so an organiser can see what is being inherited. */
    private Integer teamJerseyNumber;
    private String organisationName;
    @JsonProperty("isEligible")
    private boolean isEligible;
    private String eligibilityNote;
    @JsonProperty("hasActiveSuspension")
    private boolean hasActiveSuspension;
    private String suspensionReason;
    private Integer suspensionMatchesRemaining;
    private String position;
}
