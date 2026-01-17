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
}
