package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.LineupHintsDTO;
import com.athleticaos.backend.services.TournamentRosterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/matches/{matchId}/lineup-hints")
@RequiredArgsConstructor
@Tag(name = "Match Lineup", description = "Endpoints for match lineup management and hints")
public class MatchLineupController {

    private final TournamentRosterService rosterService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get lineup hints (eligibility, suspensions) for a match")
    public ResponseEntity<LineupHintsDTO> getLineupHints(@PathVariable UUID matchId) {
        return ResponseEntity.ok(rosterService.getLineupHints(matchId));
    }
}
