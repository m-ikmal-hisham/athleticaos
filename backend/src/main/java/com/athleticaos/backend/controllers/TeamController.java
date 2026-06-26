package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.team.TeamUpdateRequest;
import com.athleticaos.backend.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;
import com.athleticaos.backend.dtos.team.AddTeamStaffRequest;
import com.athleticaos.backend.dtos.team.TeamStaffDTO;

import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.dtos.player.PlayerBatchResponse;
import com.athleticaos.backend.dtos.player.PlayerRowDTO;

@RestController
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamController {

    private final TeamService teamService;
    private final PlayerService playerService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TeamResponse>> getAllTeams(@RequestParam(required = false) UUID organisationId) {
        return ResponseEntity.ok(teamService.getAllTeams(organisationId));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<TeamResponse> getTeamById(@PathVariable UUID id) {
        return ResponseEntity.ok(teamService.getTeamById(id));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/slug/{slug}")
    public ResponseEntity<TeamResponse> getTeamBySlug(@PathVariable String slug) {
        log.info("Fetching team by slug: {}", slug);
        return ResponseEntity.ok(teamService.getTeamBySlug(slug));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamResponse> createTeam(@RequestBody @Valid TeamCreateRequest request,
            HttpServletRequest httpRequest) {
        log.info("Admin creating team: {}", request.getName());
        return ResponseEntity.ok(teamService.createTeam(request, httpRequest));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<TeamResponse>> createBulkTeams(
            @RequestBody @Valid List<TeamCreateRequest> requests,
            HttpServletRequest httpRequest) {
        log.info("Admin creating bulk teams (size: {})", requests.size());
        List<TeamResponse> responses = teamService.createBulkTeams(requests, httpRequest);
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamResponse> updateTeam(@PathVariable UUID id,
            @RequestBody @Valid TeamUpdateRequest request, HttpServletRequest httpRequest) {
        log.info("Admin updating team {}", id);
        return ResponseEntity.ok(teamService.updateTeam(id, request, httpRequest));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/players")
    public ResponseEntity<List<PlayerInTeamDTO>> getPlayersByTeam(@PathVariable UUID id, @RequestParam(required = false) UUID tournamentId) {
        return ResponseEntity.ok(teamService.getPlayersByTeam(id, tournamentId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> deleteTeam(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.info("Request to delete team: {}", id);
        teamService.deleteTeam(id, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/staff")
    public ResponseEntity<List<TeamStaffDTO>> getTeamStaff(@PathVariable UUID id) {
        return ResponseEntity.ok(teamService.getTeamStaff(id));
    }

    @PostMapping("/{id}/staff")
    @PreAuthorize("hasAnyAuthority('ROLE_ORG_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamStaffDTO> addTeamStaff(@PathVariable UUID id,
            @RequestBody @Valid AddTeamStaffRequest request, HttpServletRequest httpRequest) {
        log.info("Admin adding staff to team {}: person {}", id, request.getPersonId());
        return ResponseEntity.ok(teamService.addTeamStaff(id, request, httpRequest));
    }

    @DeleteMapping("/{id}/staff/{staffAssignmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ORG_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> removeTeamStaff(@PathVariable UUID id, @PathVariable UUID staffAssignmentId, HttpServletRequest httpRequest) {
        log.info("Admin removing staff {} from team {}", staffAssignmentId, id);
        teamService.removeTeamStaff(id, staffAssignmentId, httpRequest);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/available-staff")
    public ResponseEntity<List<com.athleticaos.backend.dtos.team.PersonSummaryDTO>> getAvailablePersonsForStaff(@PathVariable UUID id) {
        return ResponseEntity.ok(teamService.getAvailablePersonsForStaff(id));
    }

    @PostMapping("/{teamId}/players/batch")
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<PlayerBatchResponse> createBatchPlayers(
            @PathVariable UUID teamId,
            @RequestBody List<PlayerRowDTO> requests) {
        log.info("Request to bulk onboard players for team ID: {}, size: {}", teamId, requests.size());
        PlayerBatchResponse response = playerService.createBatchPlayers(teamId, requests);
        return ResponseEntity.ok(response);
    }
}
