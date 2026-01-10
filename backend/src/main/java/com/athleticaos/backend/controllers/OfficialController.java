package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.MatchOfficial;
import com.athleticaos.backend.entities.OfficialRegistry;
import com.athleticaos.backend.services.OfficialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/officials")
@RequiredArgsConstructor
@Tag(name = "Officials", description = "Official Management & Assignments")
public class OfficialController {

    private final OfficialService officialService;
    private final com.athleticaos.backend.services.MatchService matchService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN') or hasAuthority('ROLE_OFFICIAL')")
    @Operation(summary = "Get all registered officials")
    public ResponseEntity<List<OfficialRegistry>> getAllOfficials() {
        return ResponseEntity.ok(officialService.getAllOfficials());
    }

    @PostMapping("/register")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Register a new official")
    public ResponseEntity<OfficialRegistry> registerOfficial(
            @RequestParam UUID userId,
            @RequestParam String accreditationLevel,
            @RequestParam String primaryRole,
            @RequestParam String badgeNumber,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime expiryDate) {
        return ResponseEntity
                .ok(officialService.registerOfficial(userId, accreditationLevel, primaryRole, badgeNumber, expiryDate));
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Assign official to a match")
    public ResponseEntity<MatchOfficial> assignOfficial(
            @RequestParam UUID matchId,
            @RequestParam UUID officialId,
            @RequestParam String role) {
        return ResponseEntity.ok(officialService.assignOfficialToMatch(matchId, officialId, role));
    }

    @GetMapping("/assignments/{matchIdOrSlug}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN') or hasAuthority('ROLE_OFFICIAL')")
    @Operation(summary = "Get officials for a match")
    public ResponseEntity<List<MatchOfficial>> getMatchOfficials(@PathVariable String matchIdOrSlug) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(officialService.getOfficialsForMatch(matchId));
    }

    @GetMapping("/{officialId}/history")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_OFFICIAL')")
    @Operation(summary = "Get match history for an official")
    public ResponseEntity<List<MatchOfficial>> getOfficialHistory(@PathVariable UUID officialId) {
        return ResponseEntity.ok(officialService.getOfficialHistory(officialId));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Remove official from match")
    public ResponseEntity<Void> removeOfficial(@PathVariable UUID assignmentId) {
        officialService.removeOfficialFromMatch(assignmentId);
        return ResponseEntity.noContent().build();
    }

    private UUID resolveMatchId(String matchIdOrSlug) {
        try {
            return UUID.fromString(matchIdOrSlug);
        } catch (IllegalArgumentException e) {
            return matchService.getMatchByCode(matchIdOrSlug).getId();
        }
    }
}
