package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class PublicTournamentDetailResponse extends PublicTournamentSummaryResponse {
    private List<PublicTeamSummary> teams;
    private List<String> stages; // e.g. "Pool A", "Quarter Finals"
}
