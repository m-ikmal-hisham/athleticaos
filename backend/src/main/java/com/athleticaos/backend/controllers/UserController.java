package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.user.PlayerResponse;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.dtos.user.UserUpdateRequest;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final PlayerService playerService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable UUID id, @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    // Player-specific endpoints
    @GetMapping(params = "role")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PlayerResponse>> getUsersByRole(@RequestParam String role) {
        // Only support PLAYER role for now
        if ("PLAYER".equalsIgnoreCase(role)) {
            return ResponseEntity.ok(playerService.getAllPlayers());
        }
        return ResponseEntity.ok(List.of());
    }
}
