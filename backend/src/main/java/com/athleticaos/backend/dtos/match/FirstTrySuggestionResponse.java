package com.athleticaos.backend.dtos.match;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirstTrySuggestionResponse {
    private boolean hasTryEvents;
    private UUID suggestedWinnerTeamId;
    private String suggestedWinnerTeamName;
    private Integer minute;
    private String eventType;
}

