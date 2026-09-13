package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.auth.AuthResponse;
import com.athleticaos.backend.dtos.auth.ChangePasswordRequest;
import com.athleticaos.backend.dtos.auth.LoginRequest;
import com.athleticaos.backend.dtos.auth.RegisterRequest;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.JwtService;
import com.athleticaos.backend.security.PasswordPolicy;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final RoleRepository roleRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final PasswordPolicy passwordPolicy;
        private final AuditLogger auditLogger;

        @Transactional
        @SuppressWarnings("null")
        public AuthResponse register(RegisterRequest request) {
                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new IllegalArgumentException("Email already in use");
                }
                passwordPolicy.validate(request.getPassword(), request.getEmail());

                Role publicRole = roleRepository.findByName("ROLE_PUBLIC")
                                .orElseThrow(() -> new IllegalStateException("Default role not found"));

                var user = User.builder()
                                .email(request.getEmail())
                                .passwordHash(passwordEncoder.encode(request.getPassword()))
                                .firstName(request.getFirstName())
                                .lastName(request.getLastName())
                                .phone(request.getPhone())
                                .roles(Set.of(publicRole))
                                .isActive(true)
                                .build();

                userRepository.save(user);

                // For registration, we might not auto-login, but here we return tokens for
                // convenience
                // Need to load UserDetails for token generation
                var userDetails = new org.springframework.security.core.userdetails.User(
                                user.getEmail(),
                                user.getPasswordHash(),
                                user.isActive(),
                                true,
                                true,
                                true,
                                Set.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                                publicRole.getName())));

                var jwtToken = jwtService.generateToken(userDetails);
                var refreshToken = jwtService.generateRefreshToken(userDetails);

                return AuthResponse.builder()
                                .token(jwtToken)
                                .refreshToken(refreshToken)
                                .user(mapToUserResponse(user))
                                .build();
        }

        /**
         * Throws CredentialsExpiredException (after the password has matched) when the user must
         * change their password first; the controller maps that to PASSWORD_CHANGE_REQUIRED.
         */
        public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));

                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

                // Re-construct UserDetails or fetch via UserDetailsService
                // Since we have the user entity, we can construct it manually or use the
                // service
                // For efficiency, let's construct it here or use a mapper
                var userDetails = new org.springframework.security.core.userdetails.User(
                                user.getEmail(),
                                user.getPasswordHash(),
                                user.isActive(),
                                true,
                                true,
                                true,
                                user.getRoles().stream()
                                                .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                                                role.getName()))
                                                .collect(java.util.stream.Collectors.toList()));

                var jwtToken = jwtService.generateToken(userDetails);
                var refreshToken = jwtService.generateRefreshToken(userDetails);

                auditLogger.logLoginSuccess(user, httpRequest);

                return AuthResponse.builder()
                                .token(jwtToken)
                                .refreshToken(refreshToken)
                                .user(mapToUserResponse(user))
                                .build();
        }

        /**
         * Unauthenticated self-service change: verifies email + current password itself, so it also
         * serves users blocked by must_change_password. Revokes older tokens and signs the user in.
         */
        @Transactional
        public AuthResponse changePassword(ChangePasswordRequest request, HttpServletRequest httpRequest) {
                Optional<User> found = userRepository.findByEmail(request.getEmail());
                if (found.isEmpty()) {
                        passwordEncoder.encode(request.getCurrentPassword()); // keep timing similar to the found path
                        throw new BadCredentialsException("Invalid credentials");
                }
                User user = found.get();
                if (!user.isActive() || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                        throw new BadCredentialsException("Invalid credentials");
                }
                if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
                        throw new IllegalArgumentException("New password must be different from the current password");
                }
                passwordPolicy.validate(request.getNewPassword(), user.getEmail());

                user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
                user.setMustChangePassword(false);
                user.setPasswordChangedAt(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
                userRepository.save(user);
                auditLogger.logPasswordChanged(user, httpRequest);

                return login(LoginRequest.builder()
                                .email(user.getEmail())
                                .password(request.getNewPassword())
                                .build(), httpRequest);
        }

        private UserResponse mapToUserResponse(User user) {
                return UserResponse.builder()
                                .id(user.getId())
                                .firstName(user.getFirstName())
                                .lastName(user.getLastName())
                                .email(user.getEmail())
                                .phone(user.getPhone())
                                .isActive(user.isActive())
                                .status(user.isActive() ? "Active" : "Inactive")
                                .roles(user.getRoles().stream().map(role -> role.getName()).collect(Collectors.toSet()))
                                .organisationId(user.getOrganisation() != null ? user.getOrganisation().getId() : null)
                                .createdAt(user.getCreatedAt())
                                .updatedAt(user.getUpdatedAt())
                                .build();
        }
}
