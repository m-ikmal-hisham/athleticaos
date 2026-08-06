package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.TournamentStageType;
import lombok.Data;

import java.util.UUID;

@Data
public class ManualBracketCreateRequest {
    private TournamentStageType type;
    private int teamCount; // e.g. 4, 8
    private UUID categoryId;

    /**
     * Adds a playoff contested by the losers of this bracket's semi-finals — the same
     * relationship "3rd Place Playoff" has to the Cup bracket. Requires at least four teams.
     */
    private Boolean includePlacementPlayoff;

    /**
     * Overrides the label prefixed to this bracket's stage names (e.g. "Development" instead
     * of "Plate"). Falls back to the bracket type when null or blank.
     */
    private String name;
}
