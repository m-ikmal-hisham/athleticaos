package com.athleticaos.backend.dtos.match;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class OperationsDashboardDTO {
    private long liveMatches;
    private long pendingMatches;
    private long completedMatches;
    private long totalMatches;
    private List<MatchValidationDTO> attentionRequired;
}
