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
import com.athleticaos.backend.services.AccessScopeService;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final BracketService bracketService;
    private final ProgressionService progressionService;
    private final com.athleticaos.backend.services.StandingsService standingsService;
    private final com.athleticaos.backend.services.TournamentCategoryService categoryService;
    private final com.athleticaos.backend.services.MatchService matchService;
    private final com.athleticaos.backend.services.TournamentVenueService venueService;
    private final com.athleticaos.backend.services.TournamentReadinessService readinessService;
    private final AccessScopeService accessScopeService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TournamentResponse>> getAllTournaments(
            @RequestParam(required = false) String level) {
        return ResponseEntity.ok(withAccessLevel(tournamentService.getAllTournaments(level)));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}")
    public ResponseEntity<TournamentResponse> getTournamentById(@PathVariable String idOrSlug) {
        TournamentResponse tournament = fetchTournamentForAdminRead(idOrSlug);
        return ResponseEntity.ok(withAccessLevel(tournament));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/dashboard")
    public ResponseEntity<TournamentDashboardResponse> getTournamentDashboard(@PathVariable String idOrSlug) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getTournamentDashboard(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<TournamentResponse> createTournament(
            @Valid @RequestBody TournamentCreateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(withAccessLevel(tournamentService.createTournament(request, httpRequest)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<TournamentResponse> updateTournament(
            @PathVariable UUID id,
            @Valid @RequestBody TournamentUpdateRequest request,
            HttpServletRequest httpRequest) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(withAccessLevel(tournamentService.updateTournament(id, request, httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> deleteTournament(@PathVariable UUID id) {
        checkTournamentInScope(id);
        tournamentService.deleteTournament(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<TournamentResponse> publishTournament(
            @PathVariable UUID id,
            @RequestParam boolean publish,
            HttpServletRequest httpRequest) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(withAccessLevel(tournamentService.updatePublishStatus(id, publish, httpRequest)));
    }

    @PatchMapping("/{id}/featured")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<TournamentResponse> updateFeatured(
            @PathVariable UUID id,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.TournamentFeaturedRequest request,
            HttpServletRequest httpRequest) {
        fetchTournamentInOrganiserScope(id.toString());
        return ResponseEntity.ok(withAccessLevel(tournamentService.updateFeatured(id, request, httpRequest)));
    }

    @GetMapping("/{idOrSlug}/export/matches")
    @PreAuthorize("isAuthenticated()")
    @SuppressWarnings("null")
    public ResponseEntity<byte[]> exportMatches(@PathVariable String idOrSlug) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        byte[] csvData = tournamentService.exportMatches(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=matches.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(csvData);
    }

    @GetMapping("/{idOrSlug}/export/results")
    @PreAuthorize("isAuthenticated()")
    @SuppressWarnings("null")
    public ResponseEntity<byte[]> exportResults(@PathVariable String idOrSlug) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        byte[] csvData = tournamentService.exportResults(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=results.csv")
                .contentType(MediaType.TEXT_PLAIN)
                .body(csvData);
    }

    @PostMapping("/{idOrSlug}/matches/renumber")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<com.athleticaos.backend.dtos.match.MatchRenumberResponse> renumberMatches(
            @PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.match.MatchRenumberRequest request,
            HttpServletRequest httpRequest) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(matchService.renumberMatches(id, request != null && request.isDryRun(), httpRequest));
    }

    // Bracket Management Endpoints

    @GetMapping("/{idOrSlug}/bracket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BracketViewResponse> getBracket(@PathVariable String idOrSlug) {
        UUID id = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(bracketService.getBracketForTournament(id));
    }

    @PostMapping("/{id}/bracket/generate")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<BracketViewResponse> generateBracket(
            @PathVariable UUID id,
            @Valid @RequestBody BracketGenerationRequest request) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(bracketService.generateBracketForTournament(id, request));
    }

    @PostMapping("/{idOrSlug}/bracket/manual")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<BracketViewResponse> generateManualBracket(
            @PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.tournament.ManualBracketCreateRequest request) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(bracketService.generateManualKnockoutBracket(id, request));
    }

    @DeleteMapping("/{idOrSlug}/bracket/type/{stageType}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<Void> deleteManualBracket(
            @PathVariable String idOrSlug,
            @PathVariable com.athleticaos.backend.enums.TournamentStageType stageType,
            @RequestParam(required = false) UUID categoryId) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        bracketService.deleteKnockoutBracket(id, stageType, categoryId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{idOrSlug}/stages/{stageId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete an empty stage from a tournament")
    public ResponseEntity<Void> deleteEmptyStage(
            @PathVariable String idOrSlug,
            @PathVariable UUID stageId) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.deleteEmptyStage(id, stageId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<Integer> progressTournament(@PathVariable UUID id) {
        checkTournamentInScope(id);
        int progressedCount = progressionService.progressTournament(id);
        return ResponseEntity.ok(progressedCount);
    }

    @PostMapping("/{id}/apply-byes")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Advance every knockout match that has one team and no possible opponent")
    public ResponseEntity<Integer> applyByes(@PathVariable UUID id) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(matchService.applyByesForTournament(id));
    }

    @PostMapping("/{id}/progress-pools")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Seed knockout brackets from pool results, for each category whose pools are complete")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.PoolSeedingResult> progressPoolsToKnockout(
            @PathVariable UUID id) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(bracketService.progressPoolsToKnockout(id));
    }

    @GetMapping("/{idOrSlug}/readiness")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Check tournament setup readiness")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentReadinessResponse> getReadiness(
            @PathVariable String idOrSlug) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(readinessService.checkReadiness(tournamentId));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Update tournament status")
    public ResponseEntity<TournamentResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam("status") com.athleticaos.backend.enums.TournamentStatus status,
            jakarta.servlet.http.HttpServletRequest request) {
        checkTournamentInScope(id);
        return ResponseEntity.ok(withAccessLevel(tournamentService.updateStatus(id, status, request)));
    }

    @GetMapping("/{idOrSlug}/teams")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all teams participating in a tournament")
    public ResponseEntity<List<TeamResponse>> getTeamsByTournament(@PathVariable String idOrSlug) {
        UUID id = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getTeamsByTournament(id));
    }

    @PostMapping("/{idOrSlug}/teams")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Add teams to tournament")
    public ResponseEntity<Void> addTeamsToTournament(@PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.tournament.TeamListRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.addTeamsToTournament(tournamentId, request.getTeamIds(), request.getCategoryId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{idOrSlug}/teams/{teamId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Remove team from tournament")
    public ResponseEntity<Void> removeTeamFromTournament(@PathVariable String idOrSlug, @PathVariable UUID teamId) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.removeTeamFromTournament(tournamentId, teamId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/teams/remove")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Remove multiple teams from tournament")
    public ResponseEntity<Void> removeTeamsFromTournament(@PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.tournament.TeamListRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.removeTeamsFromTournament(tournamentId, request.getTeamIds());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{idOrSlug}/teams/{teamId}/pool")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_CLUB_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update team pool assignment")
    public ResponseEntity<Void> updateTeamPool(@PathVariable String idOrSlug, @PathVariable UUID teamId,
            @RequestParam(required = false) String poolNumber,
            @RequestParam(required = false) Integer poolSlot) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.updateTeamPool(tournamentId, teamId, poolNumber, poolSlot);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/format/generate")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Generate tournament schedule based on format")
    public ResponseEntity<Void> generateSchedule(@PathVariable String idOrSlug,
            @RequestBody com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        tournamentService.generateSchedule(tournamentId, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/format/structure")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Generate tournament pool structure (stages) without matches")
    public ResponseEntity<Void> generateStructure(@PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        // Default pool count from request or 1? FormatService handles it.
        int poolCount = request.getNumberOfPools() != null ? request.getNumberOfPools() : 1;
        tournamentService.generateStructure(tournamentId, poolCount, request);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/matches")
    @Operation(summary = "Get all matches for a tournament")
    public ResponseEntity<List<com.athleticaos.backend.dtos.match.MatchResponse>> getMatchesByTournament(
            @PathVariable String idOrSlug) {
        UUID id = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getMatchesByTournament(id));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{idOrSlug}/standings")
    @Operation(summary = "Get standings for a tournament (pools)")
    public ResponseEntity<List<com.athleticaos.backend.dtos.standing.StandingsResponse>> getStandings(
            @PathVariable String idOrSlug) {
        UUID id = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(standingsService.getStandings(id));
    }

    @DeleteMapping("/{idOrSlug}/matches")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Clear all matches for a tournament")
    public ResponseEntity<Void> clearSchedule(
            @PathVariable String idOrSlug,
            @RequestParam(required = false, defaultValue = "false") boolean keepStructure) {

        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        // if keepStructure is true, clearStructure is false
        tournamentService.clearSchedule(id, !keepStructure);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{idOrSlug}/matches")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Create a manual match in the tournament")
    public ResponseEntity<com.athleticaos.backend.dtos.match.MatchResponse> createMatch(@PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.match.MatchCreateRequest request) {
        UUID id = fetchTournamentInOrganiserScope(idOrSlug).getId();
        request.setTournamentId(id);
        return ResponseEntity.ok(tournamentService.createMatch(id, request));
    }

    // Format Configuration Endpoints
    @GetMapping("/{idOrSlug}/format")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get tournament format configuration")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO> getFormatConfig(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID categoryId) {
        UUID tournamentId = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.getFormatConfig(tournamentId, categoryId));
    }

    @PostMapping("/{idOrSlug}/format")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    @Operation(summary = "Update tournament format configuration")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO> updateFormatConfig(
            @PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO configDTO) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(tournamentService.updateFormatConfig(tournamentId, configDTO));
    }

    // Category Management Endpoints

    @PostMapping("/{idOrSlug}/categories")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Create a tournament category")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO> createCategory(
            @PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.CreateCategoryRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(categoryService.createCategory(tournamentId, request));
    }

    @GetMapping("/{idOrSlug}/categories")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all categories for a tournament")
    public ResponseEntity<List<com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO>> getCategories(
            @PathVariable String idOrSlug) {
        UUID tournamentId = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(categoryService.getCategoriesByTournament(tournamentId));
    }

    @DeleteMapping("/{idOrSlug}/categories/{categoryId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete a tournament category")
    public ResponseEntity<Void> deleteCategory(
            @PathVariable String idOrSlug,
            @PathVariable UUID categoryId) {
        fetchTournamentInOrganiserScope(idOrSlug);
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{idOrSlug}/categories/{categoryId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update a tournament category")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentCategoryDTO> updateCategory(
            @PathVariable String idOrSlug,
            @PathVariable UUID categoryId,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.CreateCategoryRequest request) {
        fetchTournamentInOrganiserScope(idOrSlug);
        return ResponseEntity.ok(categoryService.updateCategory(categoryId, request));
    }

    // Venue Management Endpoints

    @GetMapping("/{idOrSlug}/venues")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all venues for a tournament")
    public ResponseEntity<List<com.athleticaos.backend.dtos.tournament.TournamentVenueDTO>> getVenues(
            @PathVariable String idOrSlug) {
        UUID tournamentId = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(venueService.getVenuesByTournament(tournamentId));
    }

    @GetMapping("/{idOrSlug}/venues/{venueId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a tournament venue by ID")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentVenueDTO> getVenue(
            @PathVariable String idOrSlug,
            @PathVariable UUID venueId) {
        UUID tournamentId = fetchTournamentForAdminRead(idOrSlug).getId();
        return ResponseEntity.ok(venueService.getVenue(tournamentId, venueId));
    }

    @PostMapping("/{idOrSlug}/venues")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Create a tournament venue")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentVenueDTO> createVenue(
            @PathVariable String idOrSlug,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.CreateVenueRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.status(HttpStatus.CREATED).body(venueService.createVenue(tournamentId, request));
    }

    @PutMapping("/{idOrSlug}/venues/{venueId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update a tournament venue")
    public ResponseEntity<com.athleticaos.backend.dtos.tournament.TournamentVenueDTO> updateVenue(
            @PathVariable String idOrSlug,
            @PathVariable UUID venueId,
            @Valid @RequestBody com.athleticaos.backend.dtos.tournament.UpdateVenueRequest request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        return ResponseEntity.ok(venueService.updateVenue(tournamentId, venueId, request));
    }

    @DeleteMapping("/{idOrSlug}/venues/{venueId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Delete a tournament venue")
    public ResponseEntity<Void> deleteVenue(
            @PathVariable String idOrSlug,
            @PathVariable UUID venueId) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        venueService.deleteVenue(tournamentId, venueId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{idOrSlug}/stages/{stageId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update tournament stage (e.g. rename pool or update category)")
    public ResponseEntity<Void> updateStage(
            @PathVariable String idOrSlug,
            @PathVariable UUID stageId,
            @RequestBody java.util.Map<String, Object> request) {
        UUID tournamentId = fetchTournamentInOrganiserScope(idOrSlug).getId();
        String name = request.containsKey("name") && request.get("name") != null ? String.valueOf(request.get("name")) : null;
        boolean updateCategory = request.containsKey("categoryId");
        UUID categoryId = null;
        if (updateCategory && request.get("categoryId") != null && !String.valueOf(request.get("categoryId")).isBlank()) {
            categoryId = UUID.fromString(String.valueOf(request.get("categoryId")));
        }
        tournamentService.updateStage(tournamentId, stageId, name, updateCategory, categoryId);
        return ResponseEntity.ok().build();
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

    private TournamentResponse fetchTournamentForAdminRead(String idOrSlug) {
        TournamentResponse tournament = fetchTournament(idOrSlug);
        if (!accessScopeService.canReadTournament(tournament.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for tournament read outside accessible scope: userId={}, tournamentId={}",
                    currentUserId, tournament.getId());
            throw new EntityNotFoundException("Tournament not found");
        }
        return tournament;
    }

    private TournamentResponse fetchTournamentInOrganiserScope(String idOrSlug) {
        TournamentResponse tournament = fetchTournament(idOrSlug);
        if (!accessScopeService.isTournamentInScope(tournament.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied outside organiser scope: userId={}, tournamentId={}",
                    currentUserId, tournament.getId());
            throw new EntityNotFoundException("Tournament not found");
        }
        return tournament;
    }

    private void checkTournamentInScope(UUID tournamentId) {
        if (!accessScopeService.isTournamentInScope(tournamentId)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied outside organiser scope: userId={}, tournamentId={}",
                    currentUserId, tournamentId);
            throw new EntityNotFoundException("Tournament not found");
        }
    }

    private TournamentResponse withAccessLevel(TournamentResponse response) {
        if (response == null) {
            return null;
        }
        boolean canManage = accessScopeService.isSuperAdmin()
                || (response.getOrganiserOrgId() != null && accessScopeService.isOrganisationInScope(response.getOrganiserOrgId()));
        response.setAccessLevel(canManage ? "MANAGE" : "READ_ONLY");
        return response;
    }

    private List<TournamentResponse> withAccessLevel(List<TournamentResponse> list) {
        if (list == null || list.isEmpty()) {
            return list;
        }
        boolean isSuperAdmin = accessScopeService.isSuperAdmin();
        java.util.Set<UUID> accessibleOrgIds = isSuperAdmin ? null : accessScopeService.getAccessibleOrgIds();
        for (TournamentResponse response : list) {
            if (response == null) {
                continue;
            }
            boolean canManage = isSuperAdmin
                    || (response.getOrganiserOrgId() != null
                    && accessibleOrgIds != null
                    && accessibleOrgIds.contains(response.getOrganiserOrgId()));
            response.setAccessLevel(canManage ? "MANAGE" : "READ_ONLY");
        }
        return list;
    }
}
