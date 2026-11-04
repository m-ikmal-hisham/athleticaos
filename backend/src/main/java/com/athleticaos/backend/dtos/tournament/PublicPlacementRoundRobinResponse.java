package com.athleticaos.backend.dtos.tournament;

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
public class PublicPlacementRoundRobinResponse {
    private UUID stageId;
    private String stageName;
    private UUID categoryId;
    private Integer firstPlace;
    private List<UUID> matchIds;
    private List<PlacementStandingRowResponse> table;
}

