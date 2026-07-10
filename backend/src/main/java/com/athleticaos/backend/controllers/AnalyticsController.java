package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.analytics.DisciplineCorrelation;
import com.athleticaos.backend.dtos.analytics.SeasonSummary;
import com.athleticaos.backend.dtos.analytics.TeamPerformanceTrend;
import com.athleticaos.backend.services.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Advanced Analytics", description = "Endpoints for performance and trend analysis")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/teams/{teamId}/trends")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get performance trends for a team", description = "Returns historical match results and scoring for a team.")
    public ResponseEntity<List<TeamPerformanceTrend>> getTeamTrends(@PathVariable UUID teamId) {
        return ResponseEntity.ok(analyticsService.getTeamPerformanceTrends(teamId));
    }

    @GetMapping("/competitions/{tournamentId}/discipline-impact")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get discipline vs performance correlation", description = "Returns aggregated card counts and league points for all teams in a tournament.")
    public ResponseEntity<List<DisciplineCorrelation>> getDisciplineImpact(@PathVariable UUID tournamentId) {
        return ResponseEntity.ok(analyticsService.getDisciplineImpact(tournamentId));
    }

    @GetMapping("/competitions/{tournamentId}/summary")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Get season summary", description = "Returns high-level aggregated statistics for a tournament.")
    public ResponseEntity<SeasonSummary> getSeasonSummary(@PathVariable UUID tournamentId) {
        return ResponseEntity.ok(analyticsService.getSeasonSummary(tournamentId));
    }
}
