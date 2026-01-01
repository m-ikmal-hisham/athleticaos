package com.athleticaos.backend.dtos.reporting;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ComplianceIssue {
    private String issueType; // e.g., "MISSING_RESULT", "INCOMPLETE_ROSTER", "UNVERIFIED_PLAYER"
    private String severity; // "HIGH", "MEDIUM", "LOW"
    private String description;
    private String tournamentName;
    private String matchDetails; // e.g., "Team A vs Team B (Round 3)"
    private String teamName; // if team-specific
    private String referenceId; // matchId or teamId
}
