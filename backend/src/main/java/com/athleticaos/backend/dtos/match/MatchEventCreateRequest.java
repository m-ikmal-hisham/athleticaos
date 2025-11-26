package com.athleticaos.backend.dtos.match;

import jakarta.validation.constraints.NotBlank;
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
    @NotNull(message = "Match ID is required")
    private UUID matchId;

    private UUID playerId;

    @NotBlank(message = "Event type is required")
    private String eventType;

    @NotNull(message = "Minute is required")
    private Integer minute;

    private String notes;
}
