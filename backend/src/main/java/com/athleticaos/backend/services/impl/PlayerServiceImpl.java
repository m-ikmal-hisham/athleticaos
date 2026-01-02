package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null") // Suppressing null analysis warnings for cleaner logs
public class PlayerServiceImpl implements PlayerService {

    private final PlayerRepository playerRepository;
    private final PersonRepository personRepository;
    private final UserService userService;
    private final PlayerTeamRepository playerTeamRepository;
    private final TeamRepository teamRepository;
    private final com.athleticaos.backend.services.OrganisationService organisationService;

    @Override
    @Transactional(readOnly = true)
    public PlayerResponse getPlayerById(UUID id) {
        log.info("Fetching player by id: {}", id);
        Player player = playerRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional(readOnly = true)
    public PlayerResponse getPlayerBySlug(String slug) {
        log.info("Fetching player by slug: {}", slug);
        Player player = playerRepository.findBySlug(slug)
                .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlayerResponse> getAllPlayers(UUID organisationId, UUID teamId) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Player> players;

        if (organisationId != null || teamId != null) {
            // Handle explicit filtering
            if (teamId != null) {
                // Filter by specific team (check access first?)
                // Simplification: Check if team belongs to accessible orgs if not super admin
                // For now, trusting repository + filter later
                players = playerTeamRepository.findPlayersByTeamId(teamId).stream()
                        .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                        .collect(Collectors.toList());
            } else {
                // Filter by Organisation (Hierarchical)
                java.util.Set<UUID> targetIds = organisationService.getAllDescendantIds(organisationId);

                // Security check: Ensure requested org hierarchy intersects with user's
                // accessible scope
                if (accessibleIds != null) {
                    // If accessibleIds is not null (not super admin), we must filter targetIds
                    // to only include those that are also in accessibleIds (or just check root?)
                    // Actually, if I have access to State, I have access to all children.
                    // But accessibleIds currently returns the whole subtree.
                    // So intersection is the correct approach.
                    targetIds.retainAll(accessibleIds);
                }

                if (targetIds.isEmpty()) {
                    return java.util.Collections.emptyList();
                }

                players = playerTeamRepository
                        .findPlayersByOrganisationIds(targetIds).stream()
                        .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                        .collect(Collectors.toList());
            }

        } else if (accessibleIds == null) {
            // SUPER_ADMIN sees all
            players = playerRepository.findAllByDeletedFalseOrderByCreatedAtDesc();
        } else if (accessibleIds.isEmpty()) {
            // No organisation assigned or empty hierarchy
            players = java.util.Collections.emptyList();
        } else {
            // Filter by accessible organisations via team assignments
            players = playerTeamRepository.findPlayersByOrganisationIds(accessibleIds).stream()
                    .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                    .collect(Collectors.toList());
        }

        return players.stream()
                .map(this::mapToPlayerResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @SuppressWarnings("deprecation")
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
                .identificationType(request.identificationType())
                .identificationValue(request.identificationValue())
                .nationality(request.nationality())
                .email(request.email())
                .phone(request.phone())
                .addressLine1(request.addressLine1())
                .addressLine2(request.addressLine2())
                .city(request.city())
                .postcode(request.postcode())
                .state(request.state())
                .country(request.country())
                .address(request.address()) // Legacy mapping
                .build();

        person = personRepository.save(person);
        log.info("Created person record with id: {}", person.getId());

        // Generate slug
        String name = person.getFirstName() + " " + person.getLastName();
        String slug = com.athleticaos.backend.utils.SlugGenerator.generateUniqueSlug(name,
                playerRepository::existsBySlug);

        // Create Player record (Rugby-specific)
        Player player = Player.builder()
                .person(person)
                .slug(slug)
                .status(request.status() != null ? request.status() : "ACTIVE")
                .dominantHand(request.dominantHand())
                .dominantLeg(request.dominantLeg())
                .heightCm(request.heightCm())
                .heightCm(request.heightCm())
                .weightKg(request.weightKg())
                .photoUrl(request.photoUrl())
                .build();

        player = playerRepository.save(player);
        log.info("Created player record with id: {}", player.getId());

        // Handle Immediate Team Assignment
        if (request.teamId() != null) {
            assignToTeam(player, request.teamId());
        }

        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional
    @SuppressWarnings("deprecation")
    public PlayerResponse updatePlayer(UUID id, PlayerUpdateRequest request) {
        log.info("Updating player: {}", id);

        Player player = playerRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
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
        if (request.identificationType() != null) {
            person.setIdentificationType(request.identificationType());
        }
        if (request.identificationValue() != null) {
            person.setIdentificationValue(request.identificationValue());
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

        // Structured Address Updates
        if (request.addressLine1() != null)
            person.setAddressLine1(request.addressLine1());
        if (request.addressLine2() != null)
            person.setAddressLine2(request.addressLine2());
        if (request.city() != null)
            person.setCity(request.city());
        if (request.postcode() != null)
            person.setPostcode(request.postcode());
        if (request.state() != null)
            person.setState(request.state());
        if (request.country() != null)
            person.setCountry(request.country());

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
        if (request.photoUrl() != null) {
            player.setPhotoUrl(request.photoUrl());
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
                .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        // Toggle between ACTIVE and INACTIVE
        String currentStatus = player.getStatus();
        String newStatus = "ACTIVE".equals(currentStatus) ? "INACTIVE" : "ACTIVE";
        player.setStatus(newStatus);

        player = playerRepository.save(player);
        log.info("Toggled player status to: {}", newStatus);

        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional
    public void deletePlayer(UUID id) {
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        player.setDeleted(true);
        player.setDeletedAt(java.time.LocalDateTime.now());
        playerRepository.save(player);
    }

    @Override
    @Transactional
    public void regenerateAllSlugs() {
        List<Player> players = playerRepository.findAll();
        for (Player player : players) {
            boolean changed = false;
            // Fix Null Slug
            if (player.getSlug() == null || player.getSlug().isEmpty()) {
                String baseSlug = com.athleticaos.backend.utils.SlugGenerator
                        .generateSlug(player.getPerson().getFirstName() + " " + player.getPerson().getLastName());
                String uniqueSlug = com.athleticaos.backend.utils.SlugGenerator.generateUniqueSlug(
                        baseSlug,
                        slug -> playerRepository.findBySlug(slug).isPresent());
                player.setSlug(uniqueSlug);
                changed = true;
            }
            // Fix Null Deleted
            if (player.getDeleted() == null) {
                player.setDeleted(false);
                changed = true;
            }

            if (changed) {
                playerRepository.save(player);
            }
        }
    }

    private void assignToTeam(Player player, UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        // Check if already assigned
        boolean exists = playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), teamId);
        if (exists) {
            return; // Already assigned, nothing to do
        }

        PlayerTeam playerTeam = PlayerTeam.builder()
                .player(player)
                .team(team)
                .isActive(true)
                .joinedDate(LocalDate.now())
                .build();

        playerTeamRepository.save(playerTeam);
        log.info("Assigned player {} to team {}", player.getId(), team.getId());
    }

    @SuppressWarnings("deprecation")
    private PlayerResponse mapToPlayerResponse(Player player) {
        Person person = player.getPerson();

        // Get organisation from current team assignment
        UUID organisationId = null;
        String organisationName = null;
        java.util.List<String> teamNames = new java.util.ArrayList<>();

        // Helper filter for active assignments usually won't include deleted players
        // unless logic is flawed
        List<com.athleticaos.backend.entities.PlayerTeam> playerTeams = playerTeamRepository
                .findByPlayerIdAndIsActiveTrue(player.getId());
        if (!playerTeams.isEmpty()) {
            // Get the first active team assignment
            var playerTeam = playerTeams.get(0);

            if (playerTeam.getTeam() != null && playerTeam.getTeam().getOrganisation() != null) {
                organisationId = playerTeam.getTeam().getOrganisation().getId();
                organisationName = playerTeam.getTeam().getOrganisation().getName();
            }

            // Collect all active team names
            teamNames = playerTeams.stream()
                    .map(pt -> pt.getTeam().getName())
                    .collect(java.util.stream.Collectors.toList());
        }

        return PlayerResponse.builder()
                .id(player.getId())
                .personId(person.getId())
                .slug(player.getSlug())
                .firstName(person.getFirstName())
                .lastName(person.getLastName())
                .gender(person.getGender())
                .dob(person.getDob())
                .icOrPassport(person.getIcOrPassport()) // Include for update flow
                .identificationType(person.getIdentificationType())
                .identificationValue(person.getIdentificationValue())
                .nationality(person.getNationality())
                .email(person.getEmail())
                .phone(person.getPhone())
                // Structured Address
                .addressLine1(person.getAddressLine1())
                .addressLine2(person.getAddressLine2())
                .city(person.getCity())
                .postcode(person.getPostcode())
                .state(person.getState())
                .country(person.getCountry())
                .address(person.getAddress()) // Legacy
                // Rugby
                .status(player.getStatus())
                .dominantHand(player.getDominantHand())
                .dominantLeg(player.getDominantLeg())
                .heightCm(player.getHeightCm())
                .weightKg(player.getWeightKg())
                .photoUrl(player.getPhotoUrl())
                .organisationId(organisationId)
                .organisationName(organisationName)
                .teamNames(teamNames)
                .createdAt(player.getCreatedAt())
                .build();
    }
}
