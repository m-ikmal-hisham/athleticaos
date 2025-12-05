package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerServiceImpl implements PlayerService {

    private final PlayerRepository playerRepository;
    private final PersonRepository personRepository;
    private final UserService userService;
    private final PlayerTeamRepository playerTeamRepository;

    @Override
    @Transactional(readOnly = true)
    public PlayerResponse getPlayerById(UUID id) {
        log.info("Fetching player by id: {}", id);
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlayerResponse> getAllPlayers() {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Player> players;

        if (accessibleIds == null) {
            // SUPER_ADMIN sees all
            players = playerRepository.findAllByOrderByCreatedAtDesc();
        } else if (accessibleIds.isEmpty()) {
            // No organisation assigned or empty hierarchy
            players = java.util.Collections.emptyList();
        } else {
            // Filter by accessible organisations via team assignments
            players = playerTeamRepository.findPlayersByOrganisationIds(accessibleIds);
        }

        return players.stream()
                .map(this::mapToPlayerResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PlayerResponse createPlayer(PlayerCreateRequest request) {
        log.info("Creating player: {}", request.email());

        // Check if person with email already exists
        if (personRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }

        // Create Person record (PII)
        Person person = Person.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .gender(request.gender())
                .dob(request.dob())
                .icOrPassport(request.icOrPassport())
                .nationality(request.nationality())
                .email(request.email())
                .phone(request.phone())
                .address(request.address())
                .build();

        person = personRepository.save(person);
        log.info("Created person record with id: {}", person.getId());

        // Create Player record (Rugby-specific)
        Player player = Player.builder()
                .person(person)
                .status(request.status() != null ? request.status() : "ACTIVE")
                .dominantHand(request.dominantHand())
                .dominantLeg(request.dominantLeg())
                .heightCm(request.heightCm())
                .weightKg(request.weightKg())
                .build();

        player = playerRepository.save(player);
        log.info("Created player record with id: {}", player.getId());

        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional
    public PlayerResponse updatePlayer(UUID id, PlayerUpdateRequest request) {
        log.info("Updating player: {}", id);

        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        Person person = player.getPerson();

        // Update Person (PII) fields
        if (request.firstName() != null) {
            person.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            person.setLastName(request.lastName());
        }
        if (request.gender() != null) {
            person.setGender(request.gender());
        }
        if (request.dob() != null) {
            person.setDob(request.dob());
        }
        if (request.icOrPassport() != null) {
            person.setIcOrPassport(request.icOrPassport());
        }
        if (request.nationality() != null) {
            person.setNationality(request.nationality());
        }
        if (request.email() != null) {
            person.setEmail(request.email());
        }
        if (request.phone() != null) {
            person.setPhone(request.phone());
        }
        if (request.address() != null) {
            person.setAddress(request.address());
        }

        personRepository.save(person);

        // Update Player (Rugby-specific) fields
        if (request.status() != null) {
            player.setStatus(request.status());
        }
        if (request.dominantHand() != null) {
            player.setDominantHand(request.dominantHand());
        }
        if (request.dominantLeg() != null) {
            player.setDominantLeg(request.dominantLeg());
        }
        if (request.heightCm() != null) {
            player.setHeightCm(request.heightCm());
        }
        if (request.weightKg() != null) {
            player.setWeightKg(request.weightKg());
        }

        player = playerRepository.save(player);
        log.info("Updated player: {}", id);

        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional
    public PlayerResponse toggleStatus(UUID id) {
        log.info("Toggling status for player: {}", id);

        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        // Toggle between ACTIVE and INACTIVE
        String currentStatus = player.getStatus();
        String newStatus = "ACTIVE".equals(currentStatus) ? "INACTIVE" : "ACTIVE";
        player.setStatus(newStatus);

        player = playerRepository.save(player);
        log.info("Toggled player status to: {}", newStatus);

        return mapToPlayerResponse(player);
    }

    private PlayerResponse mapToPlayerResponse(Player player) {
        Person person = player.getPerson();

        return PlayerResponse.builder()
                .id(player.getId())
                .personId(person.getId())
                .firstName(person.getFirstName())
                .lastName(person.getLastName())
                .gender(person.getGender())
                .dob(person.getDob())
                .icOrPassport(person.getIcOrPassport()) // Include for update flow
                .nationality(person.getNationality())
                .email(person.getEmail())
                .phone(person.getPhone())
                .address(person.getAddress())
                .status(player.getStatus())
                .dominantHand(player.getDominantHand())
                .dominantLeg(player.getDominantLeg())
                .heightCm(player.getHeightCm())
                .weightKg(player.getWeightKg())
                .createdAt(player.getCreatedAt())
                .build();
    }
}
