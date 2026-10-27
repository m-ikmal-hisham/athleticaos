package com.athleticaos.backend.dtos.standing;

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
public class StandingsResponse {
    private String poolName;
    private UUID teamId;
    private String teamName;
    private String teamLogoUrl;
    private String teamShortName;
    private int played;
    private int won;
    private int drawn;
    private int lost;
    private int pointsFor;
    private int pointsAgainst;
    private int pointsDiff;
    private int bonusPoints;
    private int triesFor;
    private int points; // Tournament Points
    private UUID categoryId;
    private boolean bonusPointsEnabled;
    private List<String> unrecordedBonusMatchCodes;
}
