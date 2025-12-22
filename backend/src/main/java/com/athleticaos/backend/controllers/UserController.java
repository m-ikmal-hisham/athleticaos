package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.dtos.user.InviteUserRequest;
import com.athleticaos.backend.dtos.user.InviteUserResponse;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.dtos.user.UserRolesResponse;
import com.athleticaos.backend.dtos.user.UserUpdateRequest;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.UserService;
import jakarta.servlet.http.HttpServletRequest;
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

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createUser(
            @RequestBody @jakarta.validation.Valid com.athleticaos.backend.dtos.user.UserCreateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.createUser(request, httpRequest));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable UUID id,
            @RequestBody UserUpdateRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.updateUser(id, request, httpRequest));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.updateUserStatus(id, status, httpRequest));
    }

    @PostMapping("/invite")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_CLUB_ADMIN')")
    public ResponseEntity<InviteUserResponse> inviteUser(
            @RequestBody @jakarta.validation.Valid InviteUserRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userService.inviteUser(request, httpRequest));
    }

    @GetMapping("/{id}/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserRolesResponse> getUserRoles(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.getUserRoles(id));
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
