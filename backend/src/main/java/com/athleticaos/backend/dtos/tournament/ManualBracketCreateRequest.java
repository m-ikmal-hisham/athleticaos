package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.TournamentStageType;
import lombok.Data;

import java.util.UUID;

@Data
public class ManualBracketCreateRequest {
    private TournamentStageType type;
    private int teamCount; // e.g. 4, 8
    private UUID categoryId;
}
