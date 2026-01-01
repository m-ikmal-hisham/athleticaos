package com.athleticaos.backend.dtos.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisciplineCorrelation {
    private String teamId;
    private String teamName;
    private int totalRedCards;
    private int totalYellowCards;
    private int leaguePoints;
    private int matchesPlayed;
}
