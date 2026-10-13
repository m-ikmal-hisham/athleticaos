package com.athleticaos.backend.dtos.tournament;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TournamentReadinessIssue {
    private String severity; // "ERROR" or "WARNING"
    private String code;
    private String message;
    private UUID matchId;
    private Integer matchNumber;
    private UUID stageId;
    private String stageName;
}
