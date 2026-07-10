package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.official.*;
import com.athleticaos.backend.services.OfficialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/officials")
@RequiredArgsConstructor
@Tag(name = "Officials", description = "Official Management & Assignments")
public class OfficialController {

    private final OfficialService officialService;
    private final com.athleticaos.backend.services.MatchService matchService;
    private final com.athleticaos.backend.services.TournamentService tournamentService;

    // ─── Registry ───────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Get all registered officials")
    public ResponseEntity<List<OfficialRegistryDTO>> getAllOfficials() {
        return ResponseEntity.ok(officialService.getAllOfficials());
    }

    @GetMapping("/{officialId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Get official by ID")
    public ResponseEntity<OfficialRegistryDTO> getOfficialById(@PathVariable UUID officialId) {
        return ResponseEntity.ok(officialService.getOfficialById(officialId));
    }

    @PostMapping("/register")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Register a new official")
    public ResponseEntity<OfficialRegistryDTO> registerOfficial(
            @Valid @RequestBody RegisterOfficialRequest request) {
        return ResponseEntity.ok(officialService.registerOfficial(request));
    }

    @PutMapping("/{officialId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Update an official")
    public ResponseEntity<OfficialRegistryDTO> updateOfficial(
            @PathVariable UUID officialId,
            @Valid @RequestBody RegisterOfficialRequest request) {
        return ResponseEntity.ok(officialService.updateOfficial(officialId, request));
    }

    // ─── Match Assignments ──────────────────────────────────────────────

    @PostMapping("/assignments/{matchIdOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Assign official to a match")
    public ResponseEntity<MatchOfficialDTO> assignOfficial(
            @PathVariable String matchIdOrSlug,
            @Valid @RequestBody AssignOfficialRequest request) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(officialService.assignOfficialToMatch(matchId, request));
    }

    @GetMapping("/assignments/{matchIdOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Get officials for a match")
    public ResponseEntity<List<MatchOfficialDTO>> getMatchOfficials(@PathVariable String matchIdOrSlug) {
        UUID matchId = resolveMatchId(matchIdOrSlug);
        return ResponseEntity.ok(officialService.getOfficialsForMatch(matchId));
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Remove official from match")
    public ResponseEntity<Void> removeOfficial(@PathVariable UUID assignmentId) {
        officialService.removeOfficialFromMatch(assignmentId);
        return ResponseEntity.noContent().build();
    }

    // ─── Tournament Officials Panel ─────────────────────────────────────

    @GetMapping("/tournaments/{tournamentIdOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Get tournament official panel")
    public ResponseEntity<List<TournamentOfficialDTO>> getTournamentOfficials(
            @PathVariable String tournamentIdOrSlug) {
        UUID tournamentId = resolveTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(officialService.getTournamentOfficials(tournamentId));
    }

    @PostMapping("/tournaments/{tournamentIdOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Add official to tournament panel")
    public ResponseEntity<TournamentOfficialDTO> addOfficialToTournament(
            @PathVariable String tournamentIdOrSlug,
            @Valid @RequestBody AddTournamentOfficialRequest request) {
        UUID tournamentId = resolveTournamentId(tournamentIdOrSlug);
        return ResponseEntity.ok(officialService.addOfficialToTournament(tournamentId, request));
    }

    @DeleteMapping("/tournaments/panel/{tournamentOfficialId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @Operation(summary = "Remove official from tournament panel")
    public ResponseEntity<Void> removeOfficialFromTournament(@PathVariable UUID tournamentOfficialId) {
        officialService.removeOfficialFromTournament(tournamentOfficialId);
        return ResponseEntity.noContent().build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private UUID resolveMatchId(String matchIdOrSlug) {
        try {
            return UUID.fromString(matchIdOrSlug);
        } catch (IllegalArgumentException e) {
            return matchService.getMatchByCode(matchIdOrSlug).getId();
        }
    }

    private UUID resolveTournamentId(String idOrSlug) {
        try {
            return UUID.fromString(idOrSlug);
        } catch (IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug).getId();
        }
    }
}
