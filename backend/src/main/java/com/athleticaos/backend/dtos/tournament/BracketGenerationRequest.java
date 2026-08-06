package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.TournamentFormat;

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

    private Integer numberOfPools; // used for ROUND_ROBIN or MIXED

    private Boolean includePlacementStages; // Plate/Bowl etc., optional

    /**
     * Teams per placement bracket, i.e. how many places each rung of the ladder covers.
     * 4 (the default) gives Cup 1-4, Plate 5-8, ... with no quarter-finals; 8 gives
     * Cup 1-8, Plate 9-16, ... with a quarter-final in each bracket.
     */
    private Integer placementBracketSize;

    private UUID categoryId; // optional: generate schedule for specific category

    private List<UUID> teamIds; // optional: use explicit subset of teams

    private List<String> poolNames; // optional: custom names for pools (e.g., ["Champions Pool", "Challengers
                                    // Pool"])

    @Builder.Default
    private Boolean generateTimings = true;

    @Builder.Default
    private Boolean useExistingGroups = false;
}
