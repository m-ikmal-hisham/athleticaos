package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.AddPlayersToRosterRequest;
import com.athleticaos.backend.dtos.roster.TournamentPlayerDTO;
import com.athleticaos.backend.dtos.roster.UpdatePlayerNumberRequest;
import com.athleticaos.backend.dtos.roster.AddTournamentStaffRequest;
import com.athleticaos.backend.dtos.roster.TournamentStaffDTO;
import com.athleticaos.backend.services.TournamentRosterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tournaments/{tournamentIdOrSlug}/roster")
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
        return ResponseEntity.ok(rosterService.addPlayersToRoster(tournamentId, teamId, request.getPlayerIds(),
                request.getJerseyNumbers()));
    }

    @DeleteMapping("/{tournamentPlayerId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<Void> removePlayerFromRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID tournamentPlayerId) {
        rosterService.removePlayerFromRoster(tournamentPlayerId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{teamId}/players/{playerId}/number")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<TournamentPlayerDTO> updatePlayerNumber(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID teamId,
            @PathVariable UUID playerId,
            @Valid @RequestBody UpdatePlayerNumberRequest request) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(rosterService.updateTournamentJerseyNumber(
                tournamentId, teamId, playerId, request.getTournamentJerseyNumber()));
    }

    private UUID getTournamentId(String idOrSlug) {
        try {
            return UUID.fromString(idOrSlug);
        } catch (IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug).getId();
        }
    }

    @GetMapping("/{teamId}/staff")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TOURNAMENT_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<List<TournamentStaffDTO>> getTournamentStaff(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID teamId) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(rosterService.getTournamentStaff(tournamentId, teamId));
    }

    @PostMapping("/{teamId}/staff")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<TournamentStaffDTO> addStaffToRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID teamId,
            @Valid @RequestBody AddTournamentStaffRequest request) {
        UUID tournamentId = getTournamentId(tournamentIdOrSlug);
        // ensure teamId in path matches request body or just trust request body id.
        request.setTeamId(teamId);
        return ResponseEntity.ok(rosterService.addStaffToRoster(tournamentId, request));
    }

    @DeleteMapping("/staff/{tournamentStaffId}")
    @PreAuthorize("hasAnyRole('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<Void> removeStaffFromRoster(
            @PathVariable String tournamentIdOrSlug,
            @PathVariable UUID tournamentStaffId) {
        rosterService.removeStaffFromRoster(tournamentStaffId);
        return ResponseEntity.noContent().build();
    }
}
