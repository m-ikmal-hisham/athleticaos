package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.services.PlayerService;
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
    public ResponseEntity<PlayerResponse> createPlayer(@RequestBody @Valid PlayerCreateRequest request) {
        return ResponseEntity.ok(playerService.createPlayer(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLUB_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PlayerResponse> updatePlayer(@PathVariable UUID id,
            @RequestBody @Valid PlayerUpdateRequest request) {
        return ResponseEntity.ok(playerService.updatePlayer(id, request));
    }
}
