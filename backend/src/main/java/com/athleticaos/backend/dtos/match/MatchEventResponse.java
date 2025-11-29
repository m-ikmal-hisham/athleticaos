package com.athleticaos.backend.dtos.match;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MatchEventResponse {
    private UUID id;
    private UUID matchId;
    private UUID teamId;
    private UUID playerId;
    private String eventType;
    private Integer minute;
    private String notes;
}
