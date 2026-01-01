package com.athleticaos.backend.dtos.reporting;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CompetitionHealthSummary {
    private String tournamentId;
    private String tournamentName;
    private int totalMatches;
    private int completedMatches;
    private int pendingMatches;
    private int overdueMatches;
    private double completionRate;
    private int activeTeams;
    private int issueCount;
}
