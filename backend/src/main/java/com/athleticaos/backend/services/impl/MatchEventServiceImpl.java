package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.services.MatchEventService;
import jakarta.persistence.EntityNotFoundException;
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
    private final UserRepository userRepository;

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
    public MatchEventResponse addEventToMatch(UUID matchId, MatchEventCreateRequest request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + matchId));

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new EntityNotFoundException("Team not found with ID: " + request.getTeamId()));

        User player = null;
        if (request.getPlayerId() != null) {
            player = userRepository.findById(request.getPlayerId())
                    .orElseThrow(
                            () -> new EntityNotFoundException("Player not found with ID: " + request.getPlayerId()));
        }

        // Validate that the team is part of the match
        if (!match.getHomeTeam().getId().equals(team.getId()) && !match.getAwayTeam().getId().equals(team.getId())) {
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
        return mapToResponse(savedEvent);
    }

    @Override
    @Transactional
    public void deleteEvent(UUID eventId) {
        if (!matchEventRepository.existsById(eventId)) {
            throw new EntityNotFoundException("Match Event not found with ID: " + eventId);
        }
        matchEventRepository.deleteById(eventId);
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
