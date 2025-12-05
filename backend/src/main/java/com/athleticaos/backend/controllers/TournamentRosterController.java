package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.AddPlayersToRosterRequest;
import com.athleticaos.backend.dtos.roster.TournamentPlayerDTO;
import com.athleticaos.backend.services.TournamentRosterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tournaments/{tournamentId}/roster")
@RequiredArgsConstructor
public class TournamentRosterController {

    private final TournamentRosterService rosterService;

    @GetMapping("/{teamId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<List<TournamentPlayerDTO>> getRoster(
            @PathVariable UUID tournamentId,
            @PathVariable UUID teamId) {
        return ResponseEntity.ok(rosterService.getRoster(tournamentId, teamId));
    }

    @PostMapping("/{teamId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<List<TournamentPlayerDTO>> addPlayersToRoster(
            @PathVariable UUID tournamentId,
            @PathVariable UUID teamId,
            @Valid @RequestBody AddPlayersToRosterRequest request) {
        return ResponseEntity.ok(rosterService.addPlayersToRoster(tournamentId, teamId, request.getPlayerIds()));
    }

    @DeleteMapping("/{tournamentPlayerId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<Void> removePlayerFromRoster(
            @PathVariable UUID tournamentId,
            @PathVariable UUID tournamentPlayerId) {
        rosterService.removePlayerFromRoster(tournamentPlayerId);
        return ResponseEntity.noContent().build();
    }
}
