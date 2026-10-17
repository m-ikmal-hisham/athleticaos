package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.ProgressionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.athleticaos.backend.services.AccessScopeService;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
@Tag(name = "Matches", description = "Match management endpoints")
public class MatchController {

    private final MatchService matchService;
    private final ProgressionService progressionService;
    private final AccessScopeService accessScopeService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all matches, optionally filtered by status, tournament, and team")
    public ResponseEntity<List<MatchResponse>> getAllMatches(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) UUID teamId) {
        return ResponseEntity.ok(matchService.getAllMatches(status, tournamentId, teamId));
    }

    @GetMapping("/{idOrSlug}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get match by ID or match code")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable String idOrSlug) {
        MatchResponse match = fetchMatch(idOrSlug);
        if (!accessScopeService.canReadMatch(match.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for match read outside accessible scope: userId={}, matchId={}",
                    currentUserId, match.getId());
            throw new EntityNotFoundException("Match not found");
        }
        match.setCanWrite(accessScopeService.canWriteMatch(match.getId()));
        return ResponseEntity.ok(match);
    }

    @GetMapping("/by-tournament/{tournamentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get matches by tournament ID")
    public ResponseEntity<List<MatchResponse>> getMatchesByTournament(@PathVariable UUID tournamentId) {
        if (!accessScopeService.canReadTournament(tournamentId)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for tournament matches outside accessible scope: userId={}, tournamentId={}",
                    currentUserId, tournamentId);
            throw new EntityNotFoundException("Tournament not found");
        }
        return ResponseEntity.ok(matchService.getMatchesByTournament(tournamentId));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Create a new match")
    public ResponseEntity<MatchResponse> createMatch(@RequestBody @Valid MatchCreateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(matchService.createMatch(request, httpRequest));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Update an existing match")
    public ResponseEntity<MatchResponse> updateMatch(@PathVariable UUID id,
            @RequestBody @Valid MatchUpdateRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(matchService.updateMatch(id, request, httpRequest));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_OFFICIAL', 'ROLE_MATCH_MANAGER')")
    @Operation(summary = "Update match status")
    public ResponseEntity<MatchResponse> updateMatchStatus(@PathVariable UUID id, @RequestParam String status,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(matchService.updateMatchStatus(id, status, httpRequest));
    }

    @PutMapping("/{id}/unplayed-result")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Record a walkover or bye without a played scoreline")
    public ResponseEntity<MatchResponse> recordUnplayedResult(@PathVariable UUID id,
            @RequestParam com.athleticaos.backend.enums.MatchResultType resultType,
            @RequestParam(required = false) UUID winnerTeamId,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(matchService.recordUnplayedResult(id, resultType, winnerTeamId, httpRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete a match")
    public ResponseEntity<Void> deleteMatch(@PathVariable UUID id) {
        matchService.deleteMatch(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/batch")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete multiple matches")
    public ResponseEntity<Void> deleteMatches(@RequestBody List<UUID> ids) {
        matchService.deleteMatches(ids);
        return ResponseEntity.noContent().build();
    }

    // Match Progression Endpoints

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Process match completion and advance winner to next stage")
    public ResponseEntity<Void> progressMatch(@PathVariable UUID id) {
        MatchResponse match = matchService.getMatchById(id);
        if (match.getTournamentId() == null || !accessScopeService.isTournamentInScope(match.getTournamentId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for match progress outside organiser scope: userId={}, matchId={}",
                    currentUserId, id);
            throw new EntityNotFoundException("Match not found");
        }
        progressionService.processMatchCompletion(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/can-progress")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check if match can progress to next stage")
    public ResponseEntity<Boolean> canProgress(@PathVariable UUID id) {
        if (!accessScopeService.canReadMatch(id)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for match read outside accessible scope: userId={}, matchId={}",
                    currentUserId, id);
            throw new EntityNotFoundException("Match not found");
        }
        return ResponseEntity.ok(progressionService.canProgress(id));
    }

    @GetMapping("/operations/dashboard")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_OFFICIAL', 'ROLE_ORG_ADMIN', 'ROLE_MATCH_MANAGER')")
    @Operation(summary = "Get aggregated operations dashboard data")
    public ResponseEntity<com.athleticaos.backend.dtos.match.OperationsDashboardDTO> getOperationsDashboard() {
        return ResponseEntity.ok(matchService.getOperationsDashboard());
    }

    // Helper method to fetch match by UUID or matchCode
    private MatchResponse fetchMatch(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return matchService.getMatchById(uuid);
        } catch (IllegalArgumentException e) {
            return matchService.getMatchByCode(idOrSlug);
        }
    }
}
