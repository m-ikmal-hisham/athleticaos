package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.auth.AcceptInviteRequest;
import com.athleticaos.backend.dtos.auth.AuthFeaturesResponse;
import com.athleticaos.backend.dtos.auth.AuthResponse;
import com.athleticaos.backend.dtos.auth.ChangePasswordRequest;
import com.athleticaos.backend.dtos.auth.ForgotPasswordRequest;
import com.athleticaos.backend.dtos.auth.InviteDetailsResponse;
import com.athleticaos.backend.dtos.auth.LoginRequest;
import com.athleticaos.backend.dtos.auth.RegisterRequest;
import com.athleticaos.backend.dtos.auth.ResetPasswordWithTokenRequest;
import com.athleticaos.backend.dtos.user.UserRolesResponse;
import com.athleticaos.backend.services.AuthService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.utils.ClientIpUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
        String clientIp = ClientIpUtils.getClientIp(httpRequest);

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
            AuthResponse response = authService.login(request, httpRequest);
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
        } catch (CredentialsExpiredException e) {
            // Password matched, but a change is required first. No session cookie is issued.
            return ResponseEntity.status(403)
                    .body(java.util.Map.of(
                            "code", "PASSWORD_CHANGE_REQUIRED",
                            "message", "You must set a new password before continuing."));
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
     * Self-service password change (also completes a forced change). Shares the login lockout counter.
     * Policy violations surface as 400 via GlobalExceptionHandler.
     */
    @PostMapping("/change-password")
    @SuppressWarnings("null")
    public ResponseEntity<?> changePassword(@RequestBody @Valid ChangePasswordRequest request,
                                            jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = ClientIpUtils.getClientIp(httpRequest);
        if (loginAttemptService.isBlocked(clientIp)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutMinutes(clientIp);
            return ResponseEntity.status(423)
                    .body(java.util.Map.of(
                            "message", "Too many failed attempts. Please try again in " + remainingMinutes + " minute(s).",
                            "remainingMinutes", remainingMinutes
                    ));
        }

        try {
            AuthResponse response = authService.changePassword(request, httpRequest);
            loginAttemptService.recordSuccess(clientIp);
            org.springframework.http.ResponseCookie cookie = cookieUtils.createSessionCookie(response.getToken());
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
        } catch (BadCredentialsException e) {
            loginAttemptService.recordFailure(clientIp);
            return ResponseEntity.status(401)
                    .body(java.util.Map.of("message", "Invalid email or password"));
        }
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

    @GetMapping("/features")
    public ResponseEntity<AuthFeaturesResponse> getFeatures() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new AuthFeaturesResponse(authService.isAccountEmailsEnabled()));
    }

    @GetMapping("/invite")
    public ResponseEntity<InviteDetailsResponse> getInviteDetails(@RequestParam String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(authService.getInviteDetails(token));
    }

    @PostMapping("/accept-invite")
    public ResponseEntity<?> acceptInvite(@RequestBody @Valid AcceptInviteRequest request,
                                          jakarta.servlet.http.HttpServletRequest httpRequest) {
        authService.acceptInvite(request, httpRequest);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(java.util.Map.of("message", "Password set successfully. You can now sign in."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody @Valid ForgotPasswordRequest request,
                                            jakarta.servlet.http.HttpServletRequest httpRequest) {
        authService.forgotPassword(request, httpRequest);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(java.util.Map.of("message", "If an account exists for that email, we've sent a reset link."));
    }

    @GetMapping("/reset-password")
    public ResponseEntity<?> checkResetLink(@RequestParam String token,
                                            jakarta.servlet.http.HttpServletRequest httpRequest) {
        authService.checkResetToken(token, httpRequest);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(java.util.Map.of("valid", true));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody @Valid ResetPasswordWithTokenRequest request,
                                           jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = ClientIpUtils.getClientIp(httpRequest);
        if (loginAttemptService.isBlocked(clientIp)) {
            long remainingMinutes = loginAttemptService.getRemainingLockoutMinutes(clientIp);
            return ResponseEntity.status(423)
                    .cacheControl(CacheControl.noStore())
                    .body(java.util.Map.of(
                            "message", "Account locked due to too many failed attempts. Try again in " + remainingMinutes + " minute(s).",
                            "remainingMinutes", remainingMinutes
                    ));
        }

        try {
            authService.resetPasswordWithToken(request, httpRequest);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(java.util.Map.of("message", "Password reset successfully. You can now sign in."));
        } catch (IllegalArgumentException e) {
            if (loginAttemptService.isBlocked(clientIp)) {
                long remainingMinutes = loginAttemptService.getRemainingLockoutMinutes(clientIp);
                return ResponseEntity.status(423)
                        .cacheControl(CacheControl.noStore())
                        .body(java.util.Map.of(
                                "message", "Account locked due to too many failed attempts. Try again in " + remainingMinutes + " minute(s).",
                                "remainingMinutes", remainingMinutes
                        ));
            }
            throw e;
        }
    }
}
