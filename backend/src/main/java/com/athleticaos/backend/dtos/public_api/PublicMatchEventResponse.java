package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicMatchEventResponse {
    private Integer minute;
    private String teamName;
    private String playerName;
    private String eventType; // TRY, CONVERSION, PENALTY, YELLOW_CARD, RED_CARD, SUBSTITUTION
    private Integer points;
}
