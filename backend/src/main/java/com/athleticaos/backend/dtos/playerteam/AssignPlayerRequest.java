package com.athleticaos.backend.dtos.playerteam;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AssignPlayerRequest {
    @NotNull(message = "Player ID is required")
    private UUID playerId;

    @NotNull(message = "Team ID is required")
    private UUID teamId;

    private Integer jerseyNumber;
    private String position;
    private LocalDate joinedDate;
}
