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
@RequestMapping("/api/tournaments/{tournamentIdOrSlug}/roster")
@RequiredArgsConstructor
public class TournamentRosterController {

    private final TournamentRosterService rosterService;
    private final com.athleticaos.backend.services.TournamentService tournamentService;

    @GetMapping("/{teamId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<List<TournamentPlayerDTO>> getRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID teamId) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(rosterService.getRoster(tournamentId, teamId));
    }

    @PostMapping("/{teamId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<List<TournamentPlayerDTO>> addPlayersToRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID teamId,
            @Valid @RequestBody AddPlayersToRosterRequest request) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(rosterService.addPlayersToRoster(tournamentId, teamId, request.getPlayerIds()));
    }

    @DeleteMapping("/{tournamentPlayerId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<Void> removePlayerFromRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID tournamentPlayerId) {
        rosterService.removePlayerFromRoster(tournamentPlayerId);
        return ResponseEntity.noContent().build();
    }

    private UUID getTournamentId(String idOrSlug) {
        try {
            return UUID.fromString(idOrSlug);
        } catch (IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug).getId();
        }
    }
}
