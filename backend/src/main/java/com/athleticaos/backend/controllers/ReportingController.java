package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.reporting.CompetitionHealthSummary;
import com.athleticaos.backend.dtos.reporting.ComplianceIssue;
import com.athleticaos.backend.services.ReportingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reporting")
@RequiredArgsConstructor
@Tag(name = "Reporting", description = "Analytics and Compliance Reporting Endpoints")
public class ReportingController {

    private final ReportingService reportingService;

    @GetMapping("/competitions/health")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get health summary for all active tournaments")
    public ResponseEntity<List<CompetitionHealthSummary>> getActiveTournamentsHealth() {
        return ResponseEntity.ok(reportingService.getActiveTournamentsHealth());
    }

    @GetMapping("/competitions/{seasonId}/health")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get health summary for a specific season")
    public ResponseEntity<List<CompetitionHealthSummary>> getSeasonHealth(@PathVariable UUID seasonId) {
        return ResponseEntity.ok(reportingService.getSeasonHealthSummary(seasonId));
    }

    @GetMapping("/compliance/issues")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get global compliance issues")
    public ResponseEntity<List<ComplianceIssue>> getAllComplianceIssues() {
        return ResponseEntity.ok(reportingService.getAllComplianceIssues());
    }

    @GetMapping("/compliance/issues/{tournamentId}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get compliance issues for a specific tournament")
    public ResponseEntity<List<ComplianceIssue>> getTournamentComplianceIssues(@PathVariable UUID tournamentId) {
        return ResponseEntity.ok(reportingService.getComplianceIssuesForTournament(tournamentId));
    }

    @GetMapping("/discipline/summary/{tournamentId}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get discipline summary for a specific tournament")
    public ResponseEntity<List<com.athleticaos.backend.dtos.reporting.DisciplineSummary>> getDisciplineSummary(
            @PathVariable UUID tournamentId) {
        return ResponseEntity.ok(reportingService.getDisciplineSummary(tournamentId));
    }
}
