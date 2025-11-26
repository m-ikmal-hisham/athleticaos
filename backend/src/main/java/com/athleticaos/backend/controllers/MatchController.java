package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.services.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<List<MatchResponse>> getAllMatches() {
        return ResponseEntity.ok(matchService.getAllMatches());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable UUID id) {
        return ResponseEntity.ok(matchService.getMatchById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ROLE_UNION_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<MatchResponse> createMatch(@RequestBody @Valid MatchCreateRequest request) {
        return ResponseEntity.ok(matchService.createMatch(request));
    }

    @PostMapping("/events")
    @PreAuthorize("hasAnyRole('ROLE_UNION_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_TEAM_MANAGER')")
    public ResponseEntity<Void> createMatchEvent(@RequestBody @Valid MatchEventCreateRequest request) {
        matchService.createMatchEvent(request);
        return ResponseEntity.ok().build();
    }
}
