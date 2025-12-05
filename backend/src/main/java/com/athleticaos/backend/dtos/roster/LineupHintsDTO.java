package com.athleticaos.backend.dtos.roster;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LineupHintsDTO {
    private List<LineupPlayerDTO> homeTeamPlayers;
    private List<LineupPlayerDTO> awayTeamPlayers;
}
