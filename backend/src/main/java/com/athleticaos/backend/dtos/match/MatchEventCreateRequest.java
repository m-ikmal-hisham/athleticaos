package com.athleticaos.backend.dtos.match;

import com.athleticaos.backend.enums.MatchEventType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MatchEventCreateRequest {
    @NotNull(message = "Team ID is required")
    private UUID teamId;

    private UUID playerId;

    @NotNull(message = "Event type is required")
    private MatchEventType eventType;

    private Integer minute;

    private String notes;
}
