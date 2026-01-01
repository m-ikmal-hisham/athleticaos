package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.LineupHintsDTO;
import com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO;
import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;
import com.athleticaos.backend.services.MatchLineupService;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.TournamentRosterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matches/{matchIdOrSlug}/lineup")
@RequiredArgsConstructor
@Tag(name = "Match Lineup", description = "Endpoints for match lineup management and hints")
public class MatchLineupController {

    private final TournamentRosterService rosterService;
    private final MatchService matchService;
    private final MatchLineupService matchLineupService;

    @GetMapping("/hints")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get lineup hints (eligibility, suspensions) for a match")
    public ResponseEntity<LineupHintsDTO> getLineupHints(@PathVariable String matchIdOrSlug) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(rosterService.getLineupHints(matchId));
    }

    @GetMapping
    @Operation(summary = "Get lineup for a specific team in a match")
    public ResponseEntity<List<MatchLineupEntryDTO>> getLineup(
            @PathVariable String matchIdOrSlug,
            @RequestParam UUID teamId) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(matchLineupService.getLineup(matchId, teamId));
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update lineup for a team in a match")
    public ResponseEntity<List<MatchLineupEntryDTO>> updateLineup(
            @PathVariable String matchIdOrSlug,
            @RequestBody MatchLineupUpdateRequest request) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(matchLineupService.updateLineup(matchId, request));
    }

    // Helper method to resolve match ID from UUID or matchCode
    private UUID resolveMatchId(String matchIdOrSlug) {
        try {
            return UUID.fromString(matchIdOrSlug);
        } catch (IllegalArgumentException e) {
            return matchService.getMatchByCode(matchIdOrSlug).getId();
        }
    }
}
