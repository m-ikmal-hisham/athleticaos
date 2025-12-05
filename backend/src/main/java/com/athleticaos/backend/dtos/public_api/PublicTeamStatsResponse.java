package com.athleticaos.backend.dtos.public_api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTeamStatsResponse {
    private Integer tries;
    private Integer conversions;
    private Integer penalties;
    private Integer yellowCards;
    private Integer redCards;
}
