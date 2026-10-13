package com.athleticaos.backend.dtos.tournament;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TournamentReadinessResponse {
    private boolean ok;
    @Builder.Default
    private List<TournamentReadinessIssue> issues = new ArrayList<>();
}
