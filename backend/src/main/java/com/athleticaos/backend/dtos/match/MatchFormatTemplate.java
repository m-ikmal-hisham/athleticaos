package com.athleticaos.backend.dtos.match;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchFormatTemplate {
    private String formatCode;
    private String label;
    private int startingPlayers;
    private int substitutes;
    private int periods;
    private int periodDuration;
}
