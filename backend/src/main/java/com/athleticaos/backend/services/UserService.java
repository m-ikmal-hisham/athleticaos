package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.user.PlayerResponse;
import com.athleticaos.backend.dtos.user.UserCreateRequest;
import com.athleticaos.backend.dtos.user.UserResponse;
import com.athleticaos.backend.dtos.user.UserUpdateRequest;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.repositories.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public UserResponse getUserById(UUID id) {
        return userRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public UserResponse updateUser(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getIsActive() != null) {
            user.setActive(request.getIsActive());
        }

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder
                        .encode(request.getPassword() != null ? request.getPassword() : "DefaultPass123!"))
                .isActive(true)
                .build();

        String roleName = request.getRole() != null
                ? (request.getRole().startsWith("ROLE_") ? request.getRole() : "ROLE_" + request.getRole())
                : "ROLE_PLAYER";

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + roleName));

        user.setRoles(Collections.singleton(role));

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    @SuppressWarnings("null")
    public UserResponse updateUserStatus(UUID id, String status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean isActive = "ACTIVE".equalsIgnoreCase(status) || "Active".equalsIgnoreCase(status);
        user.setActive(isActive);

        return mapToResponse(userRepository.save(user));
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .isActive(user.isActive())
                .status(user.isActive() ? "Active" : "Inactive")
                .roles(user.getRoles().stream().map(r -> r.getName()).collect(Collectors.toSet()))
                .organisationId(user.getOrganisation() != null ? user.getOrganisation().getId() : null)
                .build();
    }

    private PlayerResponse mapToPlayerResponse(User user) {
        String role = user.getRoles().stream()
                .findFirst()
                .map(Role::getName)
                .orElse("UNKNOWN");

        return new PlayerResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                role,
                user.isActive() ? "Active" : "Inactive",
                user.getOrganisation() != null ? user.getOrganisation().getName() : null);
    }
}
