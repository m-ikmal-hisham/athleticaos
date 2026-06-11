package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicMatchLineupsResponse {
    private String homeTeamName;
    private String awayTeamName;
    private List<PublicLineupEntry> homeLineup;
    private List<PublicLineupEntry> awayLineup;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PublicLineupEntry {
        private String playerName;
        private Integer jerseyNumber;
        private boolean captain;
        private String role; // STARTER, BENCH, RESERVE
        private Integer orderIndex;
        private String positionDisplay;
    }
}
