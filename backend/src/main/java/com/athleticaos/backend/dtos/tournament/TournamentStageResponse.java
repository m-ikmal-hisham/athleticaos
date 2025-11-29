package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TournamentStageResponse {
    private UUID id;
    private UUID tournamentId;
    private String name;
    private String stageType;
    private Integer displayOrder;
    private boolean groupStage;
    private boolean knockoutStage;
}
