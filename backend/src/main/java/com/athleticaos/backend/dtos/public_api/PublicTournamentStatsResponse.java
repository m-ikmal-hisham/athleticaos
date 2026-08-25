package com.athleticaos.backend.dtos.public_api;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PublicTournamentStatsResponse {
    private List<PublicPlayerStatEntry> topScorers;
    private List<PublicPlayerStatEntry> topOffenders;
    private List<PublicTeamStatEntry> topTeams;
    private List<PublicPlayerStatEntry> topTryScorers;
    private int totalMatches;
    private int totalTries;
    private int totalConversions;
    private int totalPenalties;
    private int totalYellowCards;
    private int totalRedCards;
    private int totalDoubleYellowRedCards;
    private int totalStraightRedCards;
    private int totalPoints;
}
