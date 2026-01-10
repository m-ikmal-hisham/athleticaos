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

    private UUID categoryId; // optional: generate schedule for specific category

    private List<UUID> teamIds; // optional: use explicit subset of teams

    private List<String> poolNames; // optional: custom names for pools (e.g., ["Champions Pool", "Challengers
                                    // Pool"])

    @Builder.Default
    private Boolean generateTimings = true;

    @Builder.Default
    private Boolean useExistingGroups = false;
}
