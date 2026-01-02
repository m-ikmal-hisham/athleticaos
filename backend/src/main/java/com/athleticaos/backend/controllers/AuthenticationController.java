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
    private final com.athleticaos.backend.utils.CookieUtils cookieUtils;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        AuthResponse response = authService.register(request);
        String token = response.getToken();
        if (token == null) {
            throw new IllegalStateException("Authentication failed: No token generated");
        }
        org.springframework.http.ResponseCookie cookie = cookieUtils.createSessionCookie(token);
        // We can optionally clear the token from response body if we don't want JS to
        // see it at all
        // response.setToken(null);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        AuthResponse response = authService.login(request);
        String token = response.getToken();
        if (token == null) {
            throw new IllegalStateException("Authentication failed: No token generated");
        }
        org.springframework.http.ResponseCookie cookie = cookieUtils.createSessionCookie(token);
        // response.setToken(null);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        org.springframework.http.ResponseCookie cookie = cookieUtils.cleanSessionCookie();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<com.athleticaos.backend.dtos.user.UserResponse> getCurrentUser() {
        com.athleticaos.backend.entities.User user = userService.getCurrentUser();
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }

    @GetMapping("/me/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserRolesResponse> getCurrentUserRoles() {
        // Get current user and return their roles
        com.athleticaos.backend.entities.User user = userService.getCurrentUser();
        return ResponseEntity.ok(userService.getUserRoles(user.getId()));
    }
}
