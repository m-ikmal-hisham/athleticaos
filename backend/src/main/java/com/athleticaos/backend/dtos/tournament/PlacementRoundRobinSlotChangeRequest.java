package com.athleticaos.backend.dtos.tournament;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlacementRoundRobinSlotChangeRequest {
    private UUID oldTeamId;
    private String oldPlaceholder;

    @NotNull(message = "New team ID is required")
    private UUID newTeamId;
}

