package com.athleticaos.backend.dtos.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeasonSummary {
    private int totalMatches;
    private int completedMatches;
    private int totalTries;
    private double avgPointsPerMatch;
    private String highestScoringTeam;
    private int activeTeams;
}
