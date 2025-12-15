package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.roster.PlayerSuspensionDTO;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchEventServiceImpl implements MatchEventService {

    private final MatchEventRepository matchEventRepository;
    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final com.athleticaos.backend.repositories.PlayerTeamRepository playerTeamRepository;
    private final AuditLogger auditLogger;
    private final PlayerSuspensionService suspensionService;
    private final MatchService matchService;

    @Override
    @Transactional(readOnly = true)
    public List<MatchEventResponse> getEventsForMatch(UUID matchId) {
        if (!matchRepository.existsById(matchId)) {
            throw new EntityNotFoundException("Match not found with ID: " + matchId);
        }
        return matchEventRepository.findByMatchId(matchId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MatchEventResponse addEventToMatch(UUID matchId, MatchEventCreateRequest request,
            HttpServletRequest httpRequest) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + matchId));

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new EntityNotFoundException("Team not found with ID: " + request.getTeamId()));

        Player player = null;
        if (request.getPlayerId() != null) {
            player = playerRepository.findById(request.getPlayerId())
                    .orElseThrow(
                            () -> new EntityNotFoundException("Player not found with ID: " + request.getPlayerId()));

            // Validate player belongs to the team
            boolean isPlayerInTeam = playerTeamRepository.existsByPlayerIdAndTeamId(player.getId(), team.getId());
            if (!isPlayerInTeam) {
                throw new IllegalArgumentException(
                        "Selected player " + player.getId() + " is not assigned to team " + team.getName());
            }
        }

        // Validate that the team is part of the match
        boolean isHomeTeam = match.getHomeTeam() != null && match.getHomeTeam().getId().equals(team.getId());
        boolean isAwayTeam = match.getAwayTeam() != null && match.getAwayTeam().getId().equals(team.getId());

        if (!isHomeTeam && !isAwayTeam) {
            throw new IllegalArgumentException("Team is not part of this match.");
        }

        MatchEvent event = MatchEvent.builder()
                .match(match)
                .team(team)
                .player(player)
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
     */
    private void handleSuspensions(MatchEvent event, HttpServletRequest httpRequest) {
        if (event.getPlayer() == null) {
            return; // No player involved, skip suspension logic
        }

        Match match = event.getMatch();
        Team team = event.getTeam();
        Player player = event.getPlayer();
        MatchEventType eventType = event.getEventType();

        // Red card = immediate 1 match suspension
        if (eventType == MatchEventType.RED_CARD) {
            PlayerSuspension suspension = suspensionService.createSuspension(
                    match.getTournament(),
                    team,
                    player,
                    "Red card in match " + (match.getMatchCode() != null ? match.getMatchCode() : match.getId()),
                    1 // MVP: 1 match suspension
            );
            auditLogger.logSuspensionCreated(suspension, httpRequest);
        }

        // Two yellow cards in same match = 1 match suspension
        if (eventType == MatchEventType.YELLOW_CARD) {
            long yellowCount = matchEventRepository.findByMatchId(match.getId()).stream()
                    .filter(e -> e.getPlayer() != null &&
                            e.getPlayer().getId().equals(player.getId()) &&
                            e.getEventType() == MatchEventType.YELLOW_CARD)
                    .count();

            if (yellowCount >= 2) {
                // Check if suspension already created for this match
                boolean alreadySuspended = suspensionService.getPlayerActiveSuspensions(
                        match.getTournament().getId(),
                        player.getId()).stream()
                        .anyMatch(s -> s.getReason().contains(match.getId().toString()));

                if (!alreadySuspended) {
                    PlayerSuspension suspension = suspensionService.createSuspension(
                            match.getTournament(),
                            team,
                            player,
                            "Two yellow cards in match "
                                    + (match.getMatchCode() != null ? match.getMatchCode() : match.getId()),
                            1);
                    auditLogger.logSuspensionCreated(suspension, httpRequest);
                }
            }
        }
    }

    @Override
    @Transactional
    public UUID deleteEvent(UUID eventId) {
        MatchEvent event = matchEventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Match Event not found with ID: " + eventId));
        UUID matchId = event.getMatch().getId();
        matchEventRepository.deleteById(eventId);
        matchService.recalculateMatchScores(matchId);
        return matchId;
    }

    private MatchEventResponse mapToResponse(MatchEvent event) {
        return MatchEventResponse.builder()
                .id(event.getId())
                .matchId(event.getMatch().getId())
                .teamId(event.getTeam().getId())
                .playerId(event.getPlayer() != null ? event.getPlayer().getId() : null)
                .eventType(event.getEventType().name())
                .minute(event.getMinute())
                .notes(event.getNotes())
                .build();
    }
}
