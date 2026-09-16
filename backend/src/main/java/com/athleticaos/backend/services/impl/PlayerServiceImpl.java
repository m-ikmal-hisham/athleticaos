package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.player.PlayerCreateRequest;
import com.athleticaos.backend.dtos.player.PlayerUpdateRequest;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.enums.Gender;
import com.athleticaos.backend.exceptions.DuplicateEmailException;
import com.athleticaos.backend.utils.EmailUtil;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.TournamentPlayer;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.PlayerSuspensionRepository;
import com.athleticaos.backend.dtos.player.PlayerBatchResponse;
import com.athleticaos.backend.dtos.player.PlayerRowDTO;
import com.athleticaos.backend.dtos.player.PlayerRowResult;
import com.athleticaos.backend.services.PlayerBatchHelper;
import jakarta.validation.Validator;
import jakarta.validation.ConstraintViolation;
import java.util.Set;
import java.util.ArrayList;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.entities.OrganisationPerson;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import jakarta.servlet.http.HttpServletRequest;
import com.athleticaos.backend.dtos.person.PossibleDuplicateCheck;
import com.athleticaos.backend.exceptions.EmailRequiredException;
import com.athleticaos.backend.exceptions.PossibleDuplicatePersonException;
import com.athleticaos.backend.services.PersonDuplicateService;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerServiceImpl implements PlayerService {

    private final PlayerRepository playerRepository;
    private final PersonRepository personRepository;
    private final UserService userService;
    private final PlayerTeamRepository playerTeamRepository;
    private final TournamentPlayerRepository tournamentPlayerRepository;
    private final TeamRepository teamRepository;
    private final OrganisationPersonRepository organisationPersonRepository;
    private final MatchLineupRepository matchLineupRepository;
    private final MatchEventRepository matchEventRepository;
    private final PlayerSuspensionRepository playerSuspensionRepository;
    private final com.athleticaos.backend.services.OrganisationService organisationService;
    private final PlayerBatchHelper playerBatchHelper;
    private final Validator validator;
    private final com.athleticaos.backend.audit.AuditLogger auditLogger;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final PersonDuplicateService personDuplicateService;

    @Override
    @Transactional(readOnly = true)
    public PlayerResponse getPlayerById(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Player ID must not be null");
        }
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
    public PlayerResponse getPlayerByEmail(String email) {
        log.info("Fetching player by email: {}", email);
        Player player = playerRepository.findByPerson_Email(email)
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

        String canonicalGender = Gender.from(request.gender()).name();

        // Check if email provided and normalize
        String normalizedEmail = EmailUtil.normalizeEmail(request.email());
        if (normalizedEmail == null) {
            throw new EmailRequiredException();
        }
        if (personRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateEmailException();
        }

        PossibleDuplicateCheck dupCheck = personDuplicateService.check(
                request.firstName(),
                request.lastName(),
                request.dob(),
                canonicalGender,
                null
        );
        if (dupCheck.hasMatches()) {
            if (!Boolean.TRUE.equals(request.confirmPossibleDuplicate())) {
                throw new PossibleDuplicatePersonException(
                        dupCheck.visibleMatches(),
                        dupCheck.otherOrganisationMatches()
                );
            }
        }

        // Create Person record (PII)
        Person person = Person.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .gender(canonicalGender)
                .dob(request.dob())
                .recordVerificationStatus("UNVERIFIED")
                .nationality(request.nationality())
                .email(normalizedEmail)
                .phone(request.phone())
                .addressLine1(request.addressLine1())
                .addressLine2(request.addressLine2())
                .city(request.city())
                .postcode(request.postcode())
                .state(request.state())
                .country(request.country())
                .address(request.address()) // Legacy mapping
                .build();

        if (person == null) {
            throw new IllegalStateException("Person cannot be null");
        }
        person = personRepository.saveAndFlush(person);
        log.info("Created person record with id: {}", person.getId());

        if (dupCheck.hasMatches() && Boolean.TRUE.equals(request.confirmPossibleDuplicate())) {
            final Person personForAudit = person;
            final int matchCount = dupCheck.visibleMatches().size();
            final int otherOrgMatches = dupCheck.otherOrganisationMatches();
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
                    }
                });
            } else {
                auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
            }
        }

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

        if (player == null) {
            throw new IllegalStateException("Player cannot be null");
        }
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
    public List<PlayerResponse> createBulkPlayers(List<PlayerCreateRequest> requests) {
        log.info("Creating bulk players: {} items", requests.size());
        return requests.stream()
                .map(this::createPlayer)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    @SuppressWarnings("deprecation")
    public PlayerResponse updatePlayer(UUID id, PlayerUpdateRequest request) {
        log.info("Updating player: {}", id);

        Player player = playerRepository.findByIdWithPerson(id)
                .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));

        // Explicitly load Person to avoid LazyInitializationException
        Person person = playerRepository.findPersonByPlayerId(id)
                .orElseThrow(() -> new EntityNotFoundException("Person details not found for player"));

        // Force initialization (double safety, though implicit load should suffice)
        log.debug("Loaded person for update: {}", person.getId());

        final String origFirstName = person.getFirstName();
        final String origLastName = person.getLastName();
        final LocalDate origDob = person.getDob();
        final String origGender = person.getGender();

        String canonicalGender = request.gender() != null ? Gender.from(request.gender()).name() : null;

        boolean nameChanged = (request.firstName() != null && !request.firstName().trim().equals(person.getFirstName()))
                || (request.lastName() != null && !request.lastName().trim().equals(person.getLastName()));
        boolean dobChanged = request.dob() != null && !request.dob().equals(person.getDob());
        boolean genderChanged = canonicalGender != null && !canonicalGender.equals(person.getGender());

        boolean verificationReset = false;
        if ("VERIFIED".equals(person.getRecordVerificationStatus())
                && (nameChanged || dobChanged || genderChanged)) {
            person.clearRecordVerification("UNVERIFIED");
            verificationReset = true;
        }

        // Update Person (PII) fields
        if (request.firstName() != null) {
            person.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null) {
            person.setLastName(request.lastName().trim());
        }
        if (canonicalGender != null) {
            person.setGender(canonicalGender);
        }
        if (request.dob() != null) {
            person.setDob(request.dob());
        }
        if (request.nationality() != null) {
            person.setNationality(request.nationality());
        }

        // Effective email rule
        if (request.email() != null) {
            if (request.email().trim().isEmpty()) {
                throw new EmailRequiredException();
            }
            String normalizedEmail = EmailUtil.normalizeEmail(request.email());
            if (normalizedEmail != null && personRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, person.getId())) {
                throw new DuplicateEmailException();
            }
            person.setEmail(normalizedEmail);
        } else {
            if (person.getEmail() == null || person.getEmail().trim().isEmpty()) {
                throw new EmailRequiredException("This person has no email address. Add one to save changes.");
            }
        }

        // Possible duplicate check on changed identity fields
        String origFirst = origFirstName != null ? origFirstName.trim().toLowerCase() : "";
        String origLast = origLastName != null ? origLastName.trim().toLowerCase() : "";

        String newFirst = request.firstName() != null ? request.firstName().trim().toLowerCase() : origFirst;
        String newLast = request.lastName() != null ? request.lastName().trim().toLowerCase() : origLast;
        LocalDate newDob = request.dob() != null ? request.dob() : origDob;
        String newGender = canonicalGender != null ? canonicalGender : origGender;

        boolean identityFieldsChanged = !newFirst.equals(origFirst) || !newLast.equals(origLast)
                || !java.util.Objects.equals(newDob, origDob) || !java.util.Objects.equals(newGender, origGender);

        PossibleDuplicateCheck updateDupCheck = null;
        if (identityFieldsChanged) {
            updateDupCheck = personDuplicateService.check(
                    request.firstName() != null ? request.firstName() : origFirstName,
                    request.lastName() != null ? request.lastName() : origLastName,
                    newDob, newGender, person.getId());
            if (updateDupCheck != null && updateDupCheck.hasMatches()) {
                if (!Boolean.TRUE.equals(request.confirmPossibleDuplicate())) {
                    throw new PossibleDuplicatePersonException(updateDupCheck.visibleMatches(), updateDupCheck.otherOrganisationMatches());
                }
            }
        }

        if (updateDupCheck != null && updateDupCheck.hasMatches() && Boolean.TRUE.equals(request.confirmPossibleDuplicate())) {
            final Person personForAudit = person;
            final int matchCount = updateDupCheck.visibleMatches().size();
            final int otherOrgMatches = updateDupCheck.otherOrganisationMatches();
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
                    }
                });
            } else {
                auditLogger.logPersonPossibleDuplicateOverride(personForAudit, matchCount, otherOrgMatches, currentRequest);
            }
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

        if (player == null) {
            throw new IllegalStateException("Player cannot be null");
        }
        player = playerRepository.save(player);
        log.info("Updated player: {}", id);

        if (verificationReset) {
            final Person personForAudit = person;
            final HttpServletRequest currentRequest = requestProvider.getIfAvailable();
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        auditLogger.logRecordVerificationReset(personForAudit, currentRequest);
                    }
                });
            } else {
                auditLogger.logRecordVerificationReset(personForAudit, currentRequest);
            }
        }

        return mapToPlayerResponse(player);
    }

    @Override
    @Transactional
    public PlayerResponse toggleStatus(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Player ID must not be null");
        }
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
    @SuppressWarnings("null")
    public void deletePlayer(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("Player ID must not be null");
        }
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Player not found"));
        
        Person person = player.getPerson();

        // Check if there are any ACTIVE team assignments
        List<PlayerTeam> activeTeams = playerTeamRepository.findByPlayerIdAndIsActiveTrue(id);
        
        // Check if there is any match, lineup, or suspension history
        boolean hasMatchHistory = !matchLineupRepository.findByPlayerId(id).isEmpty()
                || !matchEventRepository.findByPlayer_Id(id).isEmpty()
                || !playerSuspensionRepository.findByPlayerIdAndIsActiveTrue(id).isEmpty();

        if (activeTeams.isEmpty() && !hasMatchHistory) {
            log.info("Performing clean hard-delete for player {} and person {}", id, person != null ? person.getId() : null);
            // Delete all historical player-team assignments to avoid foreign key violations
            List<PlayerTeam> allTeams = playerTeamRepository.findByPlayerId(id);
            playerTeamRepository.deleteAll(allTeams);

            // Delete all historical tournament-player assignments to avoid foreign key violations
            List<TournamentPlayer> allTournaments = tournamentPlayerRepository.findByPlayerId(id);
            tournamentPlayerRepository.deleteAll(allTournaments);

            // Delete player
            playerRepository.delete(player);

            // Delete person if safe (no user account associated and not a staff member)
            if (person != null && person.getUserId() == null && !Boolean.TRUE.equals(person.getIsStaff())) {
                List<OrganisationPerson> orgPersons = organisationPersonRepository.findByPersonId(person.getId());
                organisationPersonRepository.deleteAll(orgPersons);
                personRepository.delete(person);
            }
            log.info("Successfully hard-deleted player {} and associated person record.", id);
        } else {
            log.info("Performing soft-delete for player {} (activeTeams size: {}, hasMatchHistory: {})", id, activeTeams.size(), hasMatchHistory);
            // Soft delete
            player.setDeleted(true);
            player.setDeletedAt(java.time.LocalDateTime.now());
            playerRepository.save(player);

            // Deactivate all active team assignments for this player
            for (PlayerTeam pt : activeTeams) {
                pt.setIsActive(false);
                playerTeamRepository.save(pt);
            }

            // Deactivate all active tournament assignments for this player
            List<TournamentPlayer> tournamentPlayers = tournamentPlayerRepository.findByPlayerIdAndIsActiveTrue(id);
            for (TournamentPlayer tp : tournamentPlayers) {
                tp.setActive(false);
                tournamentPlayerRepository.save(tp);
            }
        }
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
        if (teamId == null) {
            throw new IllegalArgumentException("Team ID must not be null");
        }
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

        if (playerTeam == null) {
            throw new IllegalStateException("PlayerTeam cannot be null");
        }
        playerTeamRepository.save(playerTeam);

        // Auto-link person to organisation
        if (team.getOrganisation() != null) {
            if (!organisationPersonRepository.existsByOrganisationIdAndPersonId(team.getOrganisation().getId(), player.getPerson().getId())) {
                OrganisationPerson op = OrganisationPerson.builder()
                        .organisation(team.getOrganisation())
                        .person(player.getPerson())
                        .build();
                if (op == null) {
                    throw new IllegalStateException("OrganisationPerson cannot be null");
                }
                organisationPersonRepository.save(op);
            }
        }

        log.info("Assigned player {} to team {}", player.getId(), team.getId());
    }

    @SuppressWarnings("deprecation")
    private PlayerResponse mapToPlayerResponse(Player player) {
        Person person = player.getPerson();

        // Get organisation from current team assignment
        UUID organisationId = null;
        String organisationName = null;
        java.util.List<String> teamNames = new java.util.ArrayList<>();

        List<com.athleticaos.backend.entities.PlayerTeam> playerTeams = playerTeamRepository
                .findByPlayerIdAndIsActiveTrue(player.getId());
        // Sort by most recent assignment first so current team drives org display
        playerTeams.sort((a, b) -> {
            var d1 = a.getJoinedDate() != null ? a.getJoinedDate() : (a.getCreatedAt() != null ? a.getCreatedAt().toLocalDate() : java.time.LocalDate.MIN);
            var d2 = b.getJoinedDate() != null ? b.getJoinedDate() : (b.getCreatedAt() != null ? b.getCreatedAt().toLocalDate() : java.time.LocalDate.MIN);
            return d2.compareTo(d1);
        });
        if (!playerTeams.isEmpty()) {
            var playerTeam = playerTeams.get(0);
            if (playerTeam.getTeam() != null && playerTeam.getTeam().getOrganisation() != null) {
                organisationId = playerTeam.getTeam().getOrganisation().getId();
                organisationName = playerTeam.getTeam().getOrganisation().getName();
            }
            teamNames = playerTeams.stream()
                    .map(pt -> pt.getTeam().getName())
                    .collect(java.util.stream.Collectors.toList());
        }

        com.athleticaos.backend.dtos.person.RecordVerificationSummary recordVerification = person.getRecordVerificationStatus() != null
                ? new com.athleticaos.backend.dtos.person.RecordVerificationSummary(
                        person.getRecordVerificationStatus(),
                        person.getRecordVerifiedAt(),
                        person.getRecordVerifiedByName(),
                        person.getRecordVerificationMethod())
                : null;

        return PlayerResponse.builder()
                .id(player.getId())
                .personId(person.getId())
                .registrationNo(person.getRegistrationNo())
                .slug(player.getSlug())
                .firstName(person.getFirstName())
                .lastName(person.getLastName())
                .gender(person.getGender())
                .dob(person.getDob())
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
                .recordVerification(recordVerification)
                .build();
    }

    @Override
    @Transactional(readOnly = false)
    public PlayerBatchResponse createBatchPlayers(UUID teamId, List<PlayerRowDTO> requests) {
        if (teamId == null) {
            throw new IllegalArgumentException("Team ID must not be null");
        }
        log.info("Starting batch player onboarding for team ID: {}, rows: {}", teamId, requests.size());

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        int successCount = 0;
        int failCount = 0;
        List<PlayerRowResult> results = new ArrayList<>();

        for (int i = 0; i < requests.size(); i++) {
            PlayerRowDTO row = requests.get(i);
            List<String> rowErrors = new ArrayList<>();

            // 1. Manual validation check using jakarta.validation.Validator
            Set<ConstraintViolation<PlayerRowDTO>> violations = validator.validate(row);
            if (!violations.isEmpty()) {
                for (ConstraintViolation<PlayerRowDTO> violation : violations) {
                    rowErrors.add(violation.getMessage());
                }
            }

            String canonicalGender = null;
            if (rowErrors.isEmpty()) {
                try {
                    canonicalGender = Gender.from(row.gender()).name();
                } catch (IllegalArgumentException e) {
                    rowErrors.add("Gender must be MALE or FEMALE.");
                }

                if (rowErrors.isEmpty()) {
                    if (row.email() == null || row.email().trim().isEmpty()) {
                        rowErrors.add("Email is required.");
                    } else {
                        String normalizedBatchEmail = EmailUtil.normalizeEmail(row.email());
                        if (normalizedBatchEmail == null) {
                            rowErrors.add("Email is required.");
                        } else if (personRepository.existsByEmailIgnoreCase(normalizedBatchEmail)) {
                            rowErrors.add("Player with this email already exists");
                        }
                    }
                }
            }

            PossibleDuplicateCheck dupCheck = null;
            if (rowErrors.isEmpty()) {
                dupCheck = personDuplicateService.check(
                        row.firstName(),
                        row.lastName(),
                        row.dob(),
                        canonicalGender,
                        null
                );
                if (dupCheck != null && dupCheck.hasMatches() && !Boolean.TRUE.equals(row.confirmPossibleDuplicate())) {
                    List<String> dupMessages = new ArrayList<>();
                    for (com.athleticaos.backend.dtos.person.PossibleDuplicateMatch match : dupCheck.visibleMatches()) {
                        dupMessages.add(String.format("Possible duplicate: %s %s (Reg: %s)",
                                match.firstName(), match.lastName(),
                                match.registrationNo() != null ? match.registrationNo() : "N/A"));
                    }
                    if (dupCheck.otherOrganisationMatches() > 0) {
                        dupMessages.add(String.format("%d additional match(es) in other organisations.", dupCheck.otherOrganisationMatches()));
                    }
                    results.add(new PlayerRowResult(i, "POSSIBLE_DUPLICATE", null, dupMessages));
                    failCount++;
                    continue;
                }
            }

            // 3. Save if valid, else fail
            if (rowErrors.isEmpty()) {
                try {
                    UUID playerId = playerBatchHelper.savePlayerInNewTransaction(row, team);
                    if (dupCheck != null && dupCheck.hasMatches() && Boolean.TRUE.equals(row.confirmPossibleDuplicate())) {
                        final PossibleDuplicateCheck finalDupCheck = dupCheck;
                        playerRepository.findByIdWithPerson(playerId).ifPresent(p -> {
                            auditLogger.logPersonPossibleDuplicateOverride(
                                    p.getPerson(),
                                    finalDupCheck.visibleMatches().size(),
                                    finalDupCheck.otherOrganisationMatches(),
                                    requestProvider.getIfAvailable()
                            );
                        });
                    }
                    results.add(new PlayerRowResult(i, "SUCCESS", playerId, null));
                    successCount++;
                } catch (Exception e) {
                    log.error("Failed to save player row at index {}", i, e);
                    rowErrors.add("Internal save error: " + e.getMessage());
                    results.add(new PlayerRowResult(i, "ERROR", null, rowErrors));
                    failCount++;
                }
            } else {
                results.add(new PlayerRowResult(i, "ERROR", null, rowErrors));
                failCount++;
            }
        }

        log.info("Batch player onboarding finished. Success: {}, Failed: {}", successCount, failCount);
        return new PlayerBatchResponse(successCount, failCount, results);
    }

}
