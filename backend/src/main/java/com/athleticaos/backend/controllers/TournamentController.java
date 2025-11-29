package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import com.athleticaos.backend.dtos.tournament.BracketViewResponse;
import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;
import com.athleticaos.backend.services.BracketService;
import com.athleticaos.backend.services.ProgressionService;
import com.athleticaos.backend.services.TournamentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tournaments")
@RequiredArgsConstructor
public class TournamentController {

    private final TournamentService tournamentService;
    private final BracketService bracketService;
    private final ProgressionService progressionService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TournamentResponse>> getAllTournaments() {
        return ResponseEntity.ok(tournamentService.getAllTournaments());
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<TournamentResponse> getTournamentById(@PathVariable UUID id) {
        return ResponseEntity.ok(tournamentService.getTournamentById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TournamentResponse> createTournament(@Valid @RequestBody TournamentCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tournamentService.createTournament(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TournamentResponse> updateTournament(
            @PathVariable UUID id,
            @Valid @RequestBody TournamentUpdateRequest request) {
        return ResponseEntity.ok(tournamentService.updateTournament(id, request));
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
            @RequestParam boolean publish) {
        return ResponseEntity.ok(tournamentService.updatePublishStatus(id, publish));
    }

    // Bracket Management Endpoints

    @GetMapping("/{id}/bracket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BracketViewResponse> getBracket(@PathVariable UUID id) {
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
}
