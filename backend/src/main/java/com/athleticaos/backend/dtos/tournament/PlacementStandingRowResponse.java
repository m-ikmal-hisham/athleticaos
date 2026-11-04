package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacementStandingRowResponse {
    private int place;
    private UUID teamId;
    private String teamName;
    private String teamShortName;
    private String teamLogoUrl;
    private String placeholder;
    private int played;
    private int won;
    private int drawn;
    private int lost;
    private int pointsFor;
    private int pointsAgainst;
    private int pointsDiff;
    private Integer bonusPoints;
    private boolean bonusPointsEnabled;
    private int points;
}

