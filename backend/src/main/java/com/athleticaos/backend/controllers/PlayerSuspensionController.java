package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.PlayerSuspensionDTO;
import com.athleticaos.backend.services.PlayerSuspensionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tournaments/{tournamentIdOrSlug}/suspensions")
@RequiredArgsConstructor
@Tag(name = "Player Suspensions", description = "Endpoints for managing player suspensions")
public class PlayerSuspensionController {

    private final PlayerSuspensionService suspensionService;
    private final com.athleticaos.backend.services.TournamentService tournamentService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get suspensions for a tournament (active only by default)")
    public ResponseEntity<List<PlayerSuspensionDTO>> getSuspensions(
            @PathVariable String tournamentIdOrSlug,
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        if (activeOnly) {
            return ResponseEntity.ok(suspensionService.getActiveSuspensions(tournamentId));
        } else {
            return ResponseEntity.ok(suspensionService.getAllSuspensions(tournamentId));
        }
    }

    @GetMapping("/player/{playerId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get active suspensions for a specific player in a tournament")
    public ResponseEntity<List<PlayerSuspensionDTO>> getPlayerSuspensions(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID playerId) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(suspensionService.getPlayerActiveSuspensions(tournamentId, playerId));
    }

    private UUID getTournamentId(String idOrSlug) {
        try {
            return UUID.fromString(idOrSlug);
        } catch (IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug).getId();
        }
    }
}
