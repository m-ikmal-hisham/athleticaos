package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.reporting.CompetitionHealthSummary;
import com.athleticaos.backend.dtos.reporting.ComplianceIssue;
import com.athleticaos.backend.dtos.reporting.DisciplineSummary;

import java.util.List;
import java.util.UUID;

public interface ReportingService {
    List<CompetitionHealthSummary> getSeasonHealthSummary(UUID seasonId);

    List<CompetitionHealthSummary> getActiveTournamentsHealth();

    List<ComplianceIssue> getComplianceIssuesForTournament(UUID tournamentId);

    // Global compliance issues (filtered by user's scope implicitly or explicitly)
    List<ComplianceIssue> getAllComplianceIssues();

    // Discipline Summary
    List<DisciplineSummary> getDisciplineSummary(UUID tournamentId);
}
