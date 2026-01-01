package com.athleticaos.backend.dtos.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformanceTrend {
    private LocalDate matchDate;
    private String opponentName;
    private int pointsScored;
    private int pointsConceded;
    private String result; // WIN, LOSS, DRAW
}
