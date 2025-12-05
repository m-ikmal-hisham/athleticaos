package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.auth.AuthResponse;
import com.athleticaos.backend.dtos.auth.LoginRequest;
import com.athleticaos.backend.dtos.auth.RegisterRequest;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        @Transactional
        @SuppressWarnings("null")
        public AuthResponse register(RegisterRequest request) {
                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new IllegalArgumentException("Email already in use");
                }

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

        public AuthResponse login(LoginRequest request) {
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

                return AuthResponse.builder()
                                .token(jwtToken)
                                .refreshToken(refreshToken)
                                .user(mapToUserResponse(user))
                                .build();
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
                                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                                .organisationId(user.getOrganisation() != null ? user.getOrganisation().getId() : null)
                                .createdAt(user.getCreatedAt())
                                .updatedAt(user.getUpdatedAt())
                                .build();
        }
}
