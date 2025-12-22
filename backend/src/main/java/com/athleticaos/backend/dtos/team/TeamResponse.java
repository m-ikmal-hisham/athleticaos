package com.athleticaos.backend.dtos.team;

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
public class TeamResponse {
    private UUID id;
    private UUID organisationId;
    private String organisationName;
    private String slug;
    private String name;
    private String category;
    private String ageGroup;
    private String division;
    private String level;
    private String state;
    private String status;
    private String poolNumber;
    private UUID tournamentCategoryId;
    private List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> players;
}
