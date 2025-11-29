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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
@Tag(name = "Matches", description = "Match management endpoints")
public class MatchController {

    private final MatchService matchService;
    private final ProgressionService progressionService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all matches")
    public ResponseEntity<List<MatchResponse>> getAllMatches() {
        return ResponseEntity.ok(matchService.getAllMatches());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get match by ID")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable UUID id) {
        return ResponseEntity.ok(matchService.getMatchById(id));
    }

    @GetMapping("/by-tournament/{tournamentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get matches by tournament ID")
    public ResponseEntity<List<MatchResponse>> getMatchesByTournament(@PathVariable UUID tournamentId) {
        return ResponseEntity.ok(matchService.getMatchesByTournament(tournamentId));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('CLUB_ADMIN')")
    @Operation(summary = "Create a new match")
    public ResponseEntity<MatchResponse> createMatch(@RequestBody @Valid MatchCreateRequest request) {
        return ResponseEntity.ok(matchService.createMatch(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('CLUB_ADMIN')")
    @Operation(summary = "Update an existing match")
    public ResponseEntity<MatchResponse> updateMatch(@PathVariable UUID id,
            @RequestBody @Valid MatchUpdateRequest request) {
        return ResponseEntity.ok(matchService.updateMatch(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete a match")
    public ResponseEntity<Void> deleteMatch(@PathVariable UUID id) {
        matchService.deleteMatch(id);
        return ResponseEntity.noContent().build();
    }

    // Match Progression Endpoints

    @PostMapping("/{id}/progress")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('CLUB_ADMIN')")
    @Operation(summary = "Process match completion and advance winner to next stage")
    public ResponseEntity<Void> progressMatch(@PathVariable UUID id) {
        progressionService.processMatchCompletion(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/can-progress")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check if match can progress to next stage")
    public ResponseEntity<Boolean> canProgress(@PathVariable UUID id) {
        return ResponseEntity.ok(progressionService.canProgress(id));
    }
}
