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
public class PlacementRoundRobinSlotSwapRequest {
    private UUID teamId1;
    private String placeholder1;

    private UUID teamId2;
    private String placeholder2;
}

