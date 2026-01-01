package com.athleticaos.backend.dtos.match;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;
import java.util.List;

@Data
@Builder
public class MatchValidationDTO {
    private UUID matchId;
    private String matchCode;
    private String homeTeamName;
    private String awayTeamName;
    private List<String> issues;
}
