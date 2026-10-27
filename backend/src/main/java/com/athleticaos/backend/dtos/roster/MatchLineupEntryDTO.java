package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchLineupEntryDTO {
    private UUID playerId;
    private String playerName; // Read-only for response
    private Integer jerseyNumber;
    private boolean isCaptain;
    private boolean isStarter; // Keeping for frontend compat if needed, but role is primary
    private com.athleticaos.backend.enums.LineupRole role;
    private Integer orderIndex;
    private String positionDisplay;
    private boolean played;
    private List<MatchLineupSubstitutionDTO> substitutions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchLineupSubstitutionDTO {
        private Integer minute;
        private String direction; // "OFF" | "ON"
        private UUID otherPlayerId;
        private String otherPlayerName;
        private Integer otherJerseyNumber;
    }
}
