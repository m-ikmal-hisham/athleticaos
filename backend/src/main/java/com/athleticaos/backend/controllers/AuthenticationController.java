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
    private final com.athleticaos.backend.services.LoginAttemptService loginAttemptService;

    @PostMapping("/register")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
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
    public ResponseEntity<?> login(@RequestBody @Valid LoginRequest request,
                                   jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);

        // Check if IP is locked out due to too many failed attempts
        if (loginAttemptService.isBlocked(clientIp)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutMinutes(clientIp);
            return ResponseEntity.status(423) // 423 Locked
                    .body(java.util.Map.of(
                            "message", "Too many failed login attempts. Please try again in " + remainingMinutes + " minute(s).",
                            "remainingMinutes", remainingMinutes
                    ));
        }

        try {
            AuthResponse response = authService.login(request);
            String token = response.getToken();
            if (token == null) {
                throw new IllegalStateException("Authentication failed: No token generated");
            }

            // Login succeeded — reset attempt counter
            loginAttemptService.recordSuccess(clientIp);

            org.springframework.http.ResponseCookie cookie = cookieUtils.createSessionCookie(token);
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (Exception e) {
            // Login failed — record the failure
            loginAttemptService.recordFailure(clientIp);

            if (loginAttemptService.isBlocked(clientIp)) {
                long remainingMinutes = loginAttemptService.getRemainingLockoutMinutes(clientIp);
                return ResponseEntity.status(423)
                        .body(java.util.Map.of(
                                "message", "Account locked due to too many failed attempts. Try again in " + remainingMinutes + " minute(s).",
                                "remainingMinutes", remainingMinutes
                        ));
            }

            return ResponseEntity.status(401)
                    .body(java.util.Map.of("message", "Invalid email or password"));
        }
    }

    /**
     * Extract client IP, respecting X-Forwarded-For header for reverse proxies.
     */
    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        org.springframework.http.ResponseCookie cookie = cookieUtils.cleanSessionCookie();
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<com.athleticaos.backend.dtos.user.UserResponse> getCurrentUser() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated() ||
                authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return ResponseEntity.noContent().build();
        }

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
