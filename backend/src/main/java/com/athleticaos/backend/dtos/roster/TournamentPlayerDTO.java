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
    private String playerNumber;
    private String organisationName;
    @JsonProperty("isEligible")
    private boolean isEligible;
    private String eligibilityNote;
    @JsonProperty("hasActiveSuspension")
    private boolean hasActiveSuspension;
    private String suspensionReason;
    private Integer suspensionMatchesRemaining;
}
