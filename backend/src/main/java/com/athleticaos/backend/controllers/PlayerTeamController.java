package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.playerteam.AssignPlayerRequest;
import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.services.PlayerTeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/player-teams")
@RequiredArgsConstructor
@Slf4j
public class PlayerTeamController {

    private final PlayerTeamService playerTeamService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COACH')")
    public ResponseEntity<Void> assignPlayerToTeam(@Valid @RequestBody AssignPlayerRequest request) {
        log.info("Assigning player {} to team {}", request.getPlayerId(), request.getTeamId());
        playerTeamService.assignPlayerToTeam(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'COACH')")
    public ResponseEntity<Void> removePlayerFromTeam(
            @RequestParam UUID playerId,
            @RequestParam UUID teamId) {
        log.info("Removing player {} from team {}", playerId, teamId);
        playerTeamService.removePlayerFromTeam(playerId, teamId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/team/{teamId}/roster")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PlayerInTeamDTO>> getTeamRoster(@PathVariable UUID teamId) {
        log.info("Fetching roster for team {}", teamId);
        List<PlayerInTeamDTO> roster = playerTeamService.getTeamRoster(teamId);
        return ResponseEntity.ok(roster);
    }

    @GetMapping("/player/{playerId}/teams")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UUID>> getPlayerTeams(@PathVariable UUID playerId) {
        log.info("Fetching teams for player {}", playerId);
        List<UUID> teamIds = playerTeamService.getPlayerTeamIds(playerId);
        return ResponseEntity.ok(teamIds);
    }
}
