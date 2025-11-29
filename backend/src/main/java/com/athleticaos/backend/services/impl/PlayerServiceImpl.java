package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.user.PlayerResponse;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.services.PlayerService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerServiceImpl implements PlayerService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public PlayerResponse getPlayerById(UUID id) {
        log.info("Fetching player by id: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        return mapToPlayerResponse(user);
    }

    @Override
    public List<PlayerResponse> getAllPlayers() {
        return userRepository.findByRoles_Name("ROLE_PLAYER").stream()
                .map(this::mapToPlayerResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PlayerResponse createPlayer(PlayerCreateRequest request) {
        log.info("Creating player: {}", request.email());
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(
                        request.password() != null ? request.password() : "DefaultPass123!"))
                .isActive(true)
                .build();

        Role playerRole = roleRepository.findByName("ROLE_PLAYER")
                .orElseThrow(() -> new EntityNotFoundException("Role ROLE_PLAYER not found"));

        user.setRoles(Collections.singleton(playerRole));

        return mapToPlayerResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public PlayerResponse updatePlayer(UUID id, PlayerUpdateRequest request) {
        log.info("Updating player: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        if (request.firstName() != null) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            user.setLastName(request.lastName());
        }
        if (request.email() != null) {
            user.setEmail(request.email());
        }
        if (request.status() != null) {
            boolean isActive = "ACTIVE".equalsIgnoreCase(request.status())
                    || "Active".equalsIgnoreCase(request.status());
            user.setActive(isActive);
        }

        return mapToPlayerResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    @SuppressWarnings("null")
    public PlayerResponse toggleStatus(UUID id) {
        log.info("Toggling status for player: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        user.setActive(!user.isActive());

        return mapToPlayerResponse(userRepository.save(user));
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
                null // Club name not yet linked
        );
    }
}
