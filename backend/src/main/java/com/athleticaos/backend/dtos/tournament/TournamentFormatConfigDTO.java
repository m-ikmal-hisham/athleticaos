package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.enums.TournamentFormat;
import jakarta.validation.constraints.Min;
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
public class TournamentFormatConfigDTO {

    private UUID id;
    private UUID tournamentId;

    @NotNull
    private TournamentFormat formatType;

    @NotNull
    private String rugbyFormat; // XV, SEVENS, TENS, TOUCH

    @Min(value = 0, message = "Team count cannot be negative")
    private Integer teamCount; // Auto-calculated from tournament teams

    @Min(1)
    private Integer poolCount;

    @NotNull
    @Min(1)
    private Integer matchDurationMinutes;

    // Scoring
    private Integer pointsWin;
    private Integer pointsDraw;
    private Integer pointsLoss;
    private Integer pointsBonusTry;
    private Integer pointsBonusLoss;

    // Lineups
    @NotNull
    private Integer startersCount;

    @NotNull
    private Integer maxBenchCount;
}
