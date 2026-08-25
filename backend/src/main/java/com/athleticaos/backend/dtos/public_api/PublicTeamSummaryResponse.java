package com.athleticaos.backend.dtos.public_api;

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
public class PublicTeamSummaryResponse {
    private UUID id;
    private String name;
    private String shortName;
    private String slug;
    private String logoUrl;
    private String category;
    private String ageGroup;
    private String division;
    private String state;
    private String organisationName;
    private int playerCount;
    private List<PublicTeamDetailResponse.TournamentSummary> tournaments;
}
