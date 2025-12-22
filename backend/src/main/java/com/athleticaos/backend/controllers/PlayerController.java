package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.services.PlayerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerService playerService;
    private final PlayerRepository playerRepository;
    private final AuditLogger auditLogger;

    @GetMapping
    public ResponseEntity<List<PlayerResponse>> getAllPlayers() {
        return ResponseEntity.ok(playerService.getAllPlayers());
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<PlayerResponse> getPlayerById(@PathVariable String idOrSlug) {
        if (isValidUUID(idOrSlug)) {
            return ResponseEntity.ok(playerService.getPlayerById(UUID.fromString(idOrSlug)));
        } else {
            return ResponseEntity.ok(playerService.getPlayerBySlug(idOrSlug));
        }
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<PlayerResponse> createPlayer(
            @RequestBody @Valid PlayerCreateRequest request,
            HttpServletRequest httpRequest) {
        PlayerResponse response = playerService.createPlayer(request);

        // Audit log
        Player player = playerRepository.findById(response.id()).orElse(null);
        if (player != null) {
            auditLogger.logPlayerCreated(player, httpRequest);
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{idOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<PlayerResponse> updatePlayer(
            @PathVariable String idOrSlug,
            @RequestBody @Valid PlayerUpdateRequest request,
            HttpServletRequest httpRequest) {
        UUID id = resolveId(idOrSlug);
        PlayerResponse response = playerService.updatePlayer(id, request);

        // Audit log
        Player player = playerRepository.findById(id).orElse(null);
        if (player != null) {
            auditLogger.logPlayerUpdated(player, httpRequest);
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{idOrSlug}")
    @PreAuthorize("hasAnyAuthority('ROLE_CLUB_ADMIN', 'ROLE_SUPER_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<Void> deletePlayer(
            @PathVariable String idOrSlug,
            HttpServletRequest httpRequest) {

        UUID id = resolveId(idOrSlug);
        Player player = playerRepository.findById(id).orElse(null);

        playerService.deletePlayer(id);

        if (player != null) {
            auditLogger.logPlayerDeleted(player, httpRequest);
        }

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/admin/regenerate-slugs")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> regenerateSlugs() {
        playerService.regenerateAllSlugs();
        return ResponseEntity.ok().build();
    }

    private boolean isValidUUID(String str) {
        try {
            UUID.fromString(str);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private UUID resolveId(String idOrSlug) {
        if (isValidUUID(idOrSlug)) {
            return UUID.fromString(idOrSlug);
        } else {
            return playerService.getPlayerBySlug(idOrSlug).id();
        }
    }
}
