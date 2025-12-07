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

    @GetMapping("/{id}")
    public ResponseEntity<PlayerResponse> getPlayerById(@PathVariable UUID id) {
        return ResponseEntity.ok(playerService.getPlayerById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CLUB_ADMIN', 'SUPER_ADMIN')")
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

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PlayerResponse> updatePlayer(
            @PathVariable UUID id,
            @RequestBody @Valid PlayerUpdateRequest request,
            HttpServletRequest httpRequest) {
        PlayerResponse response = playerService.updatePlayer(id, request);

        // Audit log
        Player player = playerRepository.findById(id).orElse(null);
        if (player != null) {
            auditLogger.logPlayerUpdated(player, httpRequest);
        }

        return ResponseEntity.ok(response);
    }
}
