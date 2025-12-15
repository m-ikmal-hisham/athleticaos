package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.services.MatchEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
@Tag(name = "Match Events", description = "Match event management endpoints")
public class MatchEventController {

    private final MatchEventService matchEventService;
    private final com.athleticaos.backend.services.MatchService matchService;

    @GetMapping("/{matchIdOrSlug}/events")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all events for a match")
    public ResponseEntity<List<MatchEventResponse>> getEventsForMatch(@PathVariable String matchIdOrSlug) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(matchEventService.getEventsForMatch(matchId));
    }

    @PostMapping("/{matchIdOrSlug}/events")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('CLUB_ADMIN')")
    @Operation(summary = "Add an event to a match")
    public ResponseEntity<MatchEventResponse> addEventToMatch(@PathVariable String matchIdOrSlug,
            @RequestBody @Valid MatchEventCreateRequest request, HttpServletRequest httpRequest) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        MatchEventResponse response = matchEventService.addEventToMatch(matchId, request, httpRequest);
        // Score recalculation is now handled in the service
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/events/{eventId}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('CLUB_ADMIN')")
    @Operation(summary = "Delete a match event")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID eventId) {
        UUID matchId = matchEventService.deleteEvent(eventId);
        if (matchId != null) {
            matchService.recalculateMatchScores(matchId);
        }
        return ResponseEntity.noContent().build();
    }

    // Helper method to resolve match ID from UUID or matchCode
    private UUID resolveMatchId(String matchIdOrSlug) {
        try {
            return UUID.fromString(matchIdOrSlug);
        } catch (IllegalArgumentException e) {
            // If not a UUID, fetch by matchCode and extract the UUID
            return matchService.getMatchByCode(matchIdOrSlug).getId();
        }
    }
}
