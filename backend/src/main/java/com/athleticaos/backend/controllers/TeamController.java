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

@RestController
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamController {

    private final TeamService teamService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<TeamResponse>> getAllTeams() {
        return ResponseEntity.ok(teamService.getAllTeams());
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

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamResponse> updateTeam(@PathVariable UUID id,
            @RequestBody @Valid TeamUpdateRequest request, HttpServletRequest httpRequest) {
        log.info("Admin updating team {}", id);
        return ResponseEntity.ok(teamService.updateTeam(id, request, httpRequest));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/players")
    public ResponseEntity<List<PlayerInTeamDTO>> getPlayersByTeam(@PathVariable UUID id) {
        return ResponseEntity.ok(teamService.getPlayersByTeam(id));
    }
}
