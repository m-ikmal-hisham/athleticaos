package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.auth.AuthResponse;
import com.athleticaos.backend.dtos.auth.LoginRequest;
import com.athleticaos.backend.dtos.auth.RegisterRequest;
import com.athleticaos.backend.dtos.user.UserRolesResponse;
import com.athleticaos.backend.services.AuthService;
import com.athleticaos.backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthService authService;
    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserRolesResponse> getCurrentUserRoles() {
        // Get current user and return their roles
        com.athleticaos.backend.entities.User user = userService.getCurrentUser();
        return ResponseEntity.ok(userService.getUserRoles(user.getId()));
    }
}
