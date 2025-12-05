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
public class PublicMatchDetailResponse extends PublicMatchSummaryResponse {
    private List<PublicMatchEventResponse> events;
    private PublicTeamStatsResponse homeStats;
    private PublicTeamStatsResponse awayStats;
}
