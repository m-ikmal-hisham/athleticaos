package com.athleticaos.backend.dtos.tournament;

import com.athleticaos.backend.dtos.match.MatchResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TournamentStageBracket {
    private TournamentStageResponse stage;
    private List<MatchResponse> matches;
}
