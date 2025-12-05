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
@RequestMapping("/api/tournaments/{tournamentId}/suspensions")
@RequiredArgsConstructor
@Tag(name = "Player Suspensions", description = "Endpoints for managing player suspensions")
public class PlayerSuspensionController {

    private final PlayerSuspensionService suspensionService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all active suspensions for a tournament")
    public ResponseEntity<List<PlayerSuspensionDTO>> getActiveSuspensions(
            @PathVariable UUID tournamentId) {
        return ResponseEntity.ok(suspensionService.getActiveSuspensions(tournamentId));
    }

    @GetMapping("/player/{playerId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get active suspensions for a specific player in a tournament")
    public ResponseEntity<List<PlayerSuspensionDTO>> getPlayerSuspensions(
            @PathVariable UUID tournamentId,
            @PathVariable UUID playerId) {
        return ResponseEntity.ok(suspensionService.getPlayerActiveSuspensions(tournamentId, playerId));
    }
}
