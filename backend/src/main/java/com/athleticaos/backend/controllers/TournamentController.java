package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import com.athleticaos.backend.dtos.tournament.BracketViewResponse;
import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentDashboardResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;
import com.athleticaos.backend.services.BracketService;
import com.athleticaos.backend.services.ProgressionService;
import com.athleticaos.backend.services.TournamentService;
import io.swagger.v3.oas.annotations.Operation;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final BracketService bracketService;
    private final ProgressionService progressionService;
    private final com.athleticaos.backend.services.StandingsService standingsService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TournamentResponse>> getAllTournaments(
            @RequestParam(required = false) String level) {
        return ResponseEntity.ok(tournamentService.getAllTournaments(level));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}")
    public ResponseEntity<TournamentResponse> getTournamentById(@PathVariable String idOrSlug) {
        TournamentResponse tournament = fetchTournament(idOrSlug);
        return ResponseEntity.ok(tournament);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/dashboard")
    public ResponseEntity<TournamentDashboardResponse> getTournamentDashboard(@PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getTournamentDashboard(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TournamentResponse> createTournament(
            @Valid @RequestBody TournamentCreateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tournamentService.createTournament(request, httpRequest));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TournamentResponse> updateTournament(
            @PathVariable UUID id,
            @Valid @RequestBody TournamentUpdateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(tournamentService.updateTournament(id, request, httpRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> deleteTournament(@PathVariable UUID id) {
        tournamentService.deleteTournament(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TournamentResponse> publishTournament(
            @PathVariable UUID id,
            @RequestParam boolean publish,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(tournamentService.updatePublishStatus(id, publish, httpRequest));
    }

    @GetMapping("/{idOrSlug}/export/matches")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportMatches(@PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        byte[] csvData = tournamentService.exportMatches(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=matches.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(csvData);
    }

    @GetMapping("/{idOrSlug}/export/results")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> exportResults(@PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        byte[] csvData = tournamentService.exportResults(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=results.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(csvData);
    }

    // Bracket Management Endpoints

    @GetMapping("/{idOrSlug}/bracket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BracketViewResponse> getBracket(@PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(bracketService.getBracketForTournament(id));
    }

    @PostMapping("/{id}/bracket/generate")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    public ResponseEntity<BracketViewResponse> generateBracket(
            @PathVariable UUID id,
            @Valid @RequestBody BracketGenerationRequest request) {
        return ResponseEntity.ok(bracketService.generateBracketForTournament(id, request));
    }

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    public ResponseEntity<Integer> progressTournament(@PathVariable UUID id) {
        int progressedCount = progressionService.progressTournament(id);
        return ResponseEntity.ok(progressedCount);
    }

    @PostMapping("/{id}/progress-pools")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Progress pool winners to knockout stage")
    public ResponseEntity<Void> progressPoolsToKnockout(@PathVariable UUID id) {
        bracketService.progressPoolsToKnockout(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Update tournament status")
    public ResponseEntity<TournamentResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam("status") com.athleticaos.backend.enums.TournamentStatus status,
            jakarta.servlet.http.HttpServletRequest request) {
        return ResponseEntity.ok(tournamentService.updateStatus(id, status, request));
    }

    @GetMapping("/{idOrSlug}/teams")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all teams participating in a tournament")
    public ResponseEntity<List<TeamResponse>> getTeamsByTournament(@PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getTeamsByTournament(id));
    }

    @PostMapping("/{idOrSlug}/teams")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Add teams to tournament")
    public ResponseEntity<Void> addTeamsToTournament(@PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.tournament.TeamListRequest request) {
        UUID tournamentId = fetchTournament(idOrSlug).getId();
        tournamentService.addTeamsToTournament(tournamentId, request.getTeamIds());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{idOrSlug}/teams/{teamId}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Remove team from tournament")
    public ResponseEntity<Void> removeTeamFromTournament(@PathVariable String idOrSlug, @PathVariable UUID teamId) {
        UUID tournamentId = fetchTournament(idOrSlug).getId();
        tournamentService.removeTeamFromTournament(tournamentId, teamId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/format/generate")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN')")
    @Operation(summary = "Generate tournament schedule based on format")
    public ResponseEntity<Void> generateSchedule(@PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request) {
        UUID tournamentId = fetchTournament(idOrSlug).getId();
        tournamentService.generateSchedule(tournamentId, request);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/matches")
    @Operation(summary = "Get all matches for a tournament")
    public ResponseEntity<List<com.athleticaos.backend.dtos.match.MatchResponse>> getMatchesByTournament(
            @PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getMatchesByTournament(id));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/standings")
    @Operation(summary = "Get standings for a tournament (pools)")
    public ResponseEntity<List<com.athleticaos.backend.dtos.standing.StandingsResponse>> getStandings(
            @PathVariable String idOrSlug) {
        UUID id = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(standingsService.getStandings(id));
    }

    @DeleteMapping("/{idOrSlug}/matches")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Clear all matches for a tournament")
    public ResponseEntity<Void> clearSchedule(
            @PathVariable String idOrSlug,
            @RequestParam(required = false, defaultValue = "false") boolean keepStructure) {

        UUID id = fetchTournament(idOrSlug).getId();
        // if keepStructure is true, clearStructure is false
        tournamentService.clearSchedule(id, !keepStructure);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/matches")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Create a manual match in the tournament")
    public ResponseEntity<com.athleticaos.backend.dtos.match.MatchResponse> createMatch(@PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.match.MatchCreateRequest request) {
        UUID id = fetchTournament(idOrSlug).getId();
        // Enforce tournament ID in request matches path variable
        request.setTournamentId(id);
        // Delegate to matchService or tournamentService?
        // Existing MatchController uses MatchService.
        // We probably should use MatchService but ensure validation. For now, let's
        // stick to calling matchService if easy, or implement simple logic.
        // There is no matchService injected here. Let's see if we can do it via
        // tournamentService.
        // I will add createMatch to TournamentService.
        return ResponseEntity.ok(tournamentService.createMatch(id, request));
    }

    // Format Configuration Endpoints
    @GetMapping("/{idOrSlug}/format")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get tournament format configuration")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO> getFormatConfig(
            @PathVariable String idOrSlug) {
        UUID tournamentId = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getFormatConfig(tournamentId));
    }

    @PostMapping("/{idOrSlug}/format")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update tournament format configuration")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO> updateFormatConfig(
            @PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO configDTO) {
        UUID tournamentId = fetchTournament(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.updateFormatConfig(tournamentId, configDTO));
    }

    // Helper method to fetch tournament by UUID or slug
    private TournamentResponse fetchTournament(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return tournamentService.getTournamentById(uuid);
        } catch (IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug);
        }
    }
}
