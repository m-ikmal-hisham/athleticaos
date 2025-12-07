package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.TournamentFormat;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BracketGenerationRequest {

    private TournamentFormat format;

    @Min(value = 1, message = "Number of pools must be at least 1")
    private Integer numberOfPools; // used for ROUND_ROBIN or MIXED

    private Boolean includePlacementStages; // Plate/Bowl etc., optional

    private List<UUID> teamIds; // optional: use explicit subset of teams

    private List<String> poolNames; // optional: custom names for pools (e.g., ["Champions Pool", "Challengers
                                    // Pool"])
}
