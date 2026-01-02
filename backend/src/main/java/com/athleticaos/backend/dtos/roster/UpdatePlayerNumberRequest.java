package com.athleticaos.backend.dtos.roster;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating a player's tournament-specific jersey number.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePlayerNumberRequest {

    @Min(value = 1, message = "Jersey number must be positive")
    private Integer tournamentJerseyNumber;
}
