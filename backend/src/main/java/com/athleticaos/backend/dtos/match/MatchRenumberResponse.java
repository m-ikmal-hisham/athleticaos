package com.athleticaos.backend.dtos.match;

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
public class MatchRenumberResponse {
    private int matchesTotal;
    private int matchesChanged;
    private List<MatchRenumberChange> changes;
    private List<VenueBreakdown> venueBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchRenumberChange {
        private UUID matchId;
        private UUID venueId;
        private String venueName;
        private String venue;
        private Integer currentNumber;
        private Integer newNumber;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VenueBreakdown {
        private UUID venueId;
        private String venueName;
        private String venue;
        private int matchCount;
    }
}
