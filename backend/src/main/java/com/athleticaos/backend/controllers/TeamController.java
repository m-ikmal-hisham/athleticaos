package com.athleticaos.backend.controllers;

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

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamResponse> createTeam(@RequestBody @Valid TeamCreateRequest request) {
        log.info("Admin creating team: {}", request.getName());
        return ResponseEntity.ok(teamService.createTeam(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<TeamResponse> updateTeam(@PathVariable UUID id,
            @RequestBody @Valid TeamUpdateRequest request) {
        log.info("Admin updating team {}", id);
        return ResponseEntity.ok(teamService.updateTeam(id, request));
    }
}
