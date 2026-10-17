package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.match.MatchEventUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.PlayerSuspension;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.services.MatchEventService;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchEventServiceImpl implements MatchEventService {

        private final MatchEventRepository matchEventRepository;
        private final MatchRepository matchRepository;
        private final TeamRepository teamRepository;
        private final PlayerRepository playerRepository;
        private final com.athleticaos.backend.repositories.PlayerTeamRepository playerTeamRepository;
        private final com.athleticaos.backend.repositories.TournamentPlayerRepository tournamentPlayerRepository;
        private final AuditLogger auditLogger;
        private final PlayerSuspensionService suspensionService;
        private final MatchService matchService;
        private final com.athleticaos.backend.services.UserService userService;
        private final com.athleticaos.backend.repositories.MatchOfficialRepository matchOfficialRepository;
        private final com.athleticaos.backend.services.AccessScopeService accessScopeService;

        private boolean isOfficialUser(com.athleticaos.backend.entities.MatchOfficial mo, UUID userId) {
                if (mo == null || mo.getOfficial() == null || userId == null) {
                        return false;
                }
                var official = mo.getOfficial();
                UUID officialUserId = official.getUser() != null
                                ? official.getUser().getId()
                                : (official.getPerson() != null ? official.getPerson().getUserId() : null);
                return userId.equals(officialUserId);
        }

        @Override
        @Transactional(readOnly = true)
        @SuppressWarnings("null")
        public List<MatchEventResponse> getEventsForMatch(UUID matchId) {
                if (!matchRepository.existsById(matchId)) {
                        throw new EntityNotFoundException("Match not found with ID: " + matchId);
                }
                if (!accessScopeService.canReadMatch(matchId)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for match events read outside accessible scope: userId={}, matchId={}",
                                        currentUserId, matchId);
                        throw new EntityNotFoundException("Match not found");
                }
                return matchEventRepository.findByMatchId(matchId).stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        @SuppressWarnings("null")
        public MatchEventResponse addEventToMatch(UUID matchId, MatchEventCreateRequest request,
                        HttpServletRequest httpRequest) {

                Match match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Match not found with ID: " + matchId));

                // Granular Permission Check
                if (!accessScopeService.canWriteMatch(match)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for match event create outside accessible scope: userId={}, matchId={}",
                                        currentUserId, matchId);
                        throw new EntityNotFoundException("Match not found");
                }

                Team team = teamRepository.findById(request.getTeamId())
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Team not found with ID: " + request.getTeamId()));

                Player player = request.getPlayerId() != null
                                ? resolveTeamPlayer(match, team, request.getPlayerId())
                                : null;

                // Validate that the team is part of the match
                boolean isHomeTeam = match.getHomeTeam() != null
                                && match.getHomeTeam().getId().equals(team.getId());
                boolean isAwayTeam = match.getAwayTeam() != null
                                && match.getAwayTeam().getId().equals(team.getId());

                if (!isHomeTeam && !isAwayTeam) {
                        throw new IllegalArgumentException("Team is not part of this match.");
                }

                if (request.getRelatedPlayerId() != null) {
                        playerRepository.findById(request.getRelatedPlayerId())
                                        .orElseThrow(() -> new EntityNotFoundException(
                                                        "Related Player not found with ID: "
                                                                        + request.getRelatedPlayerId()));
                        // Optional: Validate related player is in the same team? Or can be dependent on
                        // event (e.g. Tackle by opp?)
                        // For SUBSTITUTION, they are same team.
                        // We skip strict validation for now to be flexible.
                }

                MatchEvent event = MatchEvent.builder()
                                .match(match)
                                .team(team)
                                .player(player)
                                .relatedPlayer(request.getRelatedPlayerId() != null
                                                ? playerRepository.getReferenceById(request.getRelatedPlayerId())
                                                : null)
                                .eventType(request.getEventType())
                                .minute(request.getMinute())
                                .notes(request.getNotes())
                                .build();

                MatchEvent savedEvent = matchEventRepository.saveAndFlush(event);
                auditLogger.logMatchEventAdded(savedEvent, httpRequest);

                // Handle suspensions for disciplinary cards
                handleSuspensions(savedEvent, httpRequest);

                // Recalculate scores
                matchService.recalculateMatchScores(match.getId());

                return mapToResponse(savedEvent);
        }

        /**
         * Creates suspensions for red cards and two yellow cards.
         * Also auto-creates a RED_CARD event when a player receives their 2nd
         * yellow card in the same match (World Rugby Law 9.8).
         */
        private void handleSuspensions(MatchEvent event, HttpServletRequest httpRequest) {
                if (event.getPlayer() == null) {
                        return; // No player involved, skip suspension logic
                }

                Match match = event.getMatch();
                Team team = event.getTeam();
                Player player = event.getPlayer();
                MatchEventType eventType = event.getEventType();

                // Generate readable match label
                String homeName = match.getHomeTeam() != null ? match.getHomeTeam().getName() : "TBD";
                String awayName = match.getAwayTeam() != null ? match.getAwayTeam().getName() : "TBD";
                String tempLabel = homeName + " vs " + awayName;
                if (match.getPhase() != null && !match.getPhase().isEmpty()) {
                        tempLabel += " (" + match.getPhase() + ")";
                }
                final String matchLabel = tempLabel;

                // Red card = immediate 1 match suspension
                // Skip suspension for auto-generated red cards (from 2nd yellow) — the
                // 2-yellow suspension is already created below.
                if (eventType == MatchEventType.RED_CARD) {
                        boolean isAutoGenerated = event.getNotes() != null
                                        && event.getNotes().contains("Automatic red card");
                        if (!isAutoGenerated) {
                                PlayerSuspension suspension = suspensionService.createSuspension(
                                                match.getTournament(),
                                                team,
                                                player,
                                                match,
                                                "Red card in match " + matchLabel,
                                                1 // MVP: 1 match suspension
                                );
                                auditLogger.logSuspensionCreated(suspension, httpRequest);
                        }
                }

                // Two yellow cards in same match = automatic red card + 1 match suspension
                // (World Rugby Law 9.8)
                if (eventType == MatchEventType.YELLOW_CARD) {
                        long yellowCount = matchEventRepository.countByMatchIdAndPlayerIdAndEventType(
                                        match.getId(), player.getId(), MatchEventType.YELLOW_CARD);

                        if (yellowCount >= 2) {
                                // --- Auto-create RED_CARD event (World Rugby rule) ---
                                // Idempotency: only create if no RED_CARD already exists for this player in
                                // this match
                                long existingRedCards = matchEventRepository.countByMatchIdAndPlayerIdAndEventType(
                                                match.getId(), player.getId(), MatchEventType.RED_CARD);

                                if (existingRedCards == 0) {
                                        MatchEvent autoRedCard = MatchEvent.builder()
                                                        .match(match)
                                                        .team(team)
                                                        .player(player)
                                                        .eventType(MatchEventType.RED_CARD)
                                                        .minute(event.getMinute()) // Same minute as the 2nd yellow
                                                        .notes("Automatic red card \u2014 second yellow card in match")
                                                        .build();

                                        @SuppressWarnings("null")
                                        MatchEvent savedRedCard = matchEventRepository.saveAndFlush(autoRedCard);
                                        auditLogger.logMatchEventAdded(savedRedCard, httpRequest);
                                }

                                // --- Create suspension for two yellows ---
                                if (match.getTournament() != null) {
                                        String expectedReason = "Two yellow cards in match " + matchLabel;

                                        boolean alreadySuspended = suspensionService.getPlayerActiveSuspensions(
                                                        match.getTournament().getId(),
                                                        player.getId()).stream()
                                                        .anyMatch(s -> s.getReason() != null
                                                                        && s.getReason().contains(matchLabel));

                                        if (!alreadySuspended) {
                                                PlayerSuspension suspension = suspensionService.createSuspension(
                                                                match.getTournament(),
                                                                team,
                                                                player,
                                                                match,
                                                                expectedReason,
                                                                1);
                                                auditLogger.logSuspensionCreated(suspension, httpRequest);
                                        }
                                }
                        }
                }
        }

        /**
         * The player, provided they are on the team's roster or its squad for this tournament.
         * Shared by recording an event and attaching a player to one afterwards.
         */
        private Player resolveTeamPlayer(Match match, Team team, UUID playerId) {
                Player player = playerRepository.findById(playerId)
                                .orElseThrow(() -> new EntityNotFoundException("Player not found with ID: " + playerId));

                if (playerTeamRepository == null) {
                        throw new IllegalStateException("System Error: playerTeamRepository is not injected (null)");
                }

                // Validate player belongs to the team (Global Roster OR Tournament Roster)
                if (playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), team.getId())) {
                        return player;
                }
                if (tournamentPlayerRepository == null) {
                        throw new IllegalStateException("System Error: tournamentPlayerRepository is not injected (null)");
                }
                if (match.getTournament() == null) {
                        throw new IllegalStateException("Data Error: Match Tournament is null");
                }
                boolean isInTournamentRoster = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndPlayerId(match.getTournament().getId(), team.getId(),
                                                player.getId())
                                .isPresent();
                if (!isInTournamentRoster) {
                        // A 400 through GlobalExceptionHandler; the message is shown to the scorer as-is.
                        String name = player.getPerson() != null
                                        ? (player.getPerson().getFirstName() + " " + player.getPerson().getLastName()).trim()
                                        : "This player";
                        throw new IllegalArgumentException(name + " is not in " + team.getName()
                                        + "'s roster or squad for this tournament. Add them to the squad first, then try again.");
                }
                return player;
        }

        @Override
        @Transactional
        @SuppressWarnings("null")
        public MatchEventResponse updateEvent(UUID eventId,
                        MatchEventUpdateRequest request,
                        HttpServletRequest httpRequest) {
                MatchEvent event = matchEventRepository.findById(eventId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Match Event not found with ID: " + eventId));

                Match match = event.getMatch();
                if (!accessScopeService.canWriteMatch(match)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for match event update outside accessible scope: userId={}, eventId={}",
                                        currentUserId, eventId);
                        throw new EntityNotFoundException("Match Event not found with ID: " + eventId);
                }

                // Time-bound correction logic & Permissions
                // Similar to delete logic: check if locked/timed out
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                boolean isTimeLocked = event.getCreatedAt().plusMinutes(5).isBefore(now);

                com.athleticaos.backend.entities.User currentUser = userService.getCurrentUser();
                boolean isPrivileged = currentUser.getRoles().stream()
                                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN")
                                                || r.getName().equals("ROLE_MATCH_MANAGER")
                                                || r.getName().equals("ROLE_SUPERVISOR"))
                                || accessScopeService.isTournamentInScope(match.getTournament());

                // If event is locked/timed out, strict override required
                if (event.isLocked() || isTimeLocked) {
                        if (!isPrivileged) {
                                // Allow referees to edit if assigned (maybe they made a mistake)
                                List<com.athleticaos.backend.entities.MatchOfficial> assignments = matchOfficialRepository
                                                .findByMatchId(event.getMatch().getId());
                                boolean isAssignedReferee = assignments.stream()
                                                .anyMatch(mo -> isOfficialUser(mo, currentUser.getId()) &&
                                                                ("REFEREE".equalsIgnoreCase(mo.getAssignedRole()) ||
                                                                                "MATCH_MANAGER".equalsIgnoreCase(
                                                                                                mo.getAssignedRole())));

                                if (!isAssignedReferee) {
                                        throw new IllegalStateException(
                                                        "Cannot edit event: Grace period expired and no override permissions.");
                                }
                        }
                }

                // Update fields
                if (request.getMinute() != null) {
                        event.setMinute(request.getMinute());
                }
                if (request.getNotes() != null) {
                        event.setNotes(request.getNotes());
                }
                // A score keyed in against the team only (no lineup yet) gets its player later.
                // Same permission and grace-period rules as any other edit, checked above.
                if (request.isPlayerIdSet()) {
                        event.setPlayer(request.getPlayerId() != null
                                        ? resolveTeamPlayer(event.getMatch(), event.getTeam(), request.getPlayerId())
                                        : null);
                }

                MatchEvent savedEvent = matchEventRepository.saveAndFlush(event);

                // Recalculate scores
                matchService.recalculateMatchScores(event.getMatch().getId());

                return mapToResponse(savedEvent);
        }

        @Override
        @Transactional
        @SuppressWarnings("null")
        public UUID deleteEvent(UUID eventId, HttpServletRequest httpRequest) {
                MatchEvent event = matchEventRepository.findById(eventId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Match Event not found with ID: " + eventId));

                Match match = event.getMatch();
                if (!accessScopeService.canWriteMatch(match)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for match event delete outside accessible scope: userId={}, eventId={}",
                                        currentUserId, eventId);
                        throw new EntityNotFoundException("Match Event not found with ID: " + eventId);
                }

                // Time-bound correction logic
                // Check if event is locked or outside 5 minute grace period
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                boolean isTimeLocked = event.getCreatedAt().plusMinutes(5).isBefore(now);

                // Fetch current user
                com.athleticaos.backend.entities.User currentUser = userService.getCurrentUser();

                boolean isPrivileged = currentUser.getRoles().stream()
                                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN")
                                                || r.getName().equals("ROLE_MATCH_MANAGER")
                                                || r.getName().equals("ROLE_SUPERVISOR"))
                                || accessScopeService.isTournamentInScope(match.getTournament());

                // If event is locked/timed out, strict override required
                if (event.isLocked() || isTimeLocked) {
                        if (!isPrivileged) {
                                throw new IllegalStateException(
                                                "Cannot delete event: Grace period expired and no override permissions.");
                        }
                }

                // Granular Check: If NOT privileged, valid official assignment required
                if (!isPrivileged) {
                        List<com.athleticaos.backend.entities.MatchOfficial> assignments = matchOfficialRepository
                                        .findByMatchId(event.getMatch().getId());

                        boolean isAssigned = false;
                        boolean canDelete = false;

                        for (com.athleticaos.backend.entities.MatchOfficial mo : assignments) {
                                if (isOfficialUser(mo, currentUser.getId())) {
                                        isAssigned = true;
                                        // Granular Roles
                                        String role = mo.getAssignedRole();
                                        if ("REFEREE".equalsIgnoreCase(role)
                                                        || "MATCH_MANAGER".equalsIgnoreCase(role)) {
                                                canDelete = true;
                                        }
                                }
                        }

                        if (!isAssigned) {
                                throw new org.springframework.security.access.AccessDeniedException(
                                                "User is not assigned to this match.");
                        }
                        if (!canDelete) {
                                throw new org.springframework.security.access.AccessDeniedException(
                                                "Insufficient official permissions to delete events.");
                        }
                }

                UUID matchId = event.getMatch().getId();
                matchEventRepository.deleteById(eventId);

                // Recalculate scores
                matchService.recalculateMatchScores(matchId);

                // Ideally log this deletion
                // auditLogger.logMatchEventDeleted(event, httpRequest); // Assuming method
                // exists or generic log

                return matchId;
        }

        private MatchEventResponse mapToResponse(MatchEvent event) {
                return MatchEventResponse.builder()
                                .id(event.getId())
                                .matchId(event.getMatch().getId())
                                .teamId(event.getTeam().getId())
                                .playerId(event.getPlayer() != null ? event.getPlayer().getId() : null)
                                .teamName(event.getTeam().getName())
                                .playerName(event.getPlayer() != null
                                                ? event.getPlayer().getPerson().getFirstName() + " "
                                                                + event.getPlayer().getPerson().getLastName()
                                                : null)
                                .relatedPlayerId(event.getRelatedPlayer() != null ? event.getRelatedPlayer().getId()
                                                : null)
                                .relatedPlayerName(event.getRelatedPlayer() != null
                                                ? event.getRelatedPlayer().getPerson().getFirstName() + " "
                                                                + event.getRelatedPlayer().getPerson().getLastName()
                                                : null)
                                .eventType(event.getEventType().name())
                                .minute(event.getMinute())
                                .notes(event.getNotes())
                                .createdAt(event.getCreatedAt())
                                .isLocked(event.isLocked())
                                .build();
        }
}
