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
public class LineupPlayerDTO {
    private UUID playerId;
    private String playerName;
    private String playerNumber;
    private String position; // Added for hints
    @JsonProperty("isEligible")
    private boolean isEligible;
    private String eligibilityNote;
    @JsonProperty("isSuspended")
    private boolean isSuspended;
    private String suspensionReason;
    private Integer suspensionMatchesRemaining;
}
