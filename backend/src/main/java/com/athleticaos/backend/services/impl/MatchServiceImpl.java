package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.UserService;
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
public class MatchServiceImpl implements MatchService {

    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final TeamRepository teamRepository;
    private final com.athleticaos.backend.repositories.MatchEventRepository matchEventRepository;
    private final UserService userService;
    private final AuditLogger auditLogger;
    private final PlayerSuspensionService suspensionService;

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getAllMatches() {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Match> matches;

        if (accessibleIds == null) {
            // SUPER_ADMIN sees all
            matches = matchRepository.findAll();
        } else if (accessibleIds.isEmpty()) {
            matches = java.util.Collections.emptyList();
        } else {
            // Filter by accessible organisations (Home Team OR Away Team OR Tournament
            // Organiser)
            matches = matchRepository.findMatchesByOrganisationIds(accessibleIds);
        }

        return matches.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getMatchesByTournament(UUID tournamentId) {
        // Validate tournament exists
        if (!tournamentRepository.existsById(tournamentId)) {
            throw new EntityNotFoundException("Tournament not found with ID: " + tournamentId);
        }
        return matchRepository.findByTournamentId(tournamentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MatchResponse getMatchById(UUID id) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));
        return mapToResponse(match);
    }

    @Override
    @Transactional(readOnly = true)
    public MatchResponse getMatchByCode(String matchCode) {
        Match match = matchRepository.findByMatchCode(matchCode)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with code: " + matchCode));
        return mapToResponse(match);
    }

    @Override
    @Transactional
    public MatchResponse createMatch(MatchCreateRequest request, HttpServletRequest httpRequest) {
        Tournament tournament = tournamentRepository.findById(request.getTournamentId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Tournament not found with ID: " + request.getTournamentId()));

        Team homeTeam = teamRepository.findById(request.getHomeTeamId())
                .orElseThrow(
                        () -> new EntityNotFoundException("Home Team not found with ID: " + request.getHomeTeamId()));

        Team awayTeam = teamRepository.findById(request.getAwayTeamId())
                .orElseThrow(
                        () -> new EntityNotFoundException("Away Team not found with ID: " + request.getAwayTeamId()));

        // Validation: Home team != Away team
        if (homeTeam.getId().equals(awayTeam.getId())) {
            throw new IllegalArgumentException("Home team and Away team cannot be the same.");
        }

        // Basic Scheduling Logic: Check if match date is valid (optional soft rule,
        // keeping it simple for now)
        // We could check if matchDate is within tournament start/end dates here.

        Match match = Match.builder()
                .tournament(tournament)
                .homeTeam(homeTeam)
                .awayTeam(awayTeam)
                .matchDate(request.getMatchDate())
                .kickOffTime(request.getKickOffTime())
                .venue(request.getVenue())
                .pitch(request.getPitch())
                .phase(request.getPhase())
                .matchCode(request.getMatchCode())
                .status(MatchStatus.SCHEDULED) // Default status
                .build();

        Match savedMatch = matchRepository.save(match);
        auditLogger.logMatchCreated(savedMatch, httpRequest);
        return mapToResponse(savedMatch);
    }

    @Override
    @Transactional
    public MatchResponse updateMatch(UUID id, MatchUpdateRequest request, HttpServletRequest httpRequest) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));

        if (request.getMatchDate() != null) {
            match.setMatchDate(request.getMatchDate());
        }
        if (request.getKickOffTime() != null) {
            match.setKickOffTime(request.getKickOffTime());
        }
        if (request.getVenue() != null) {
            match.setVenue(request.getVenue());
        }
        if (request.getPitch() != null) {
            match.setPitch(request.getPitch());
        }
        if (request.getPhase() != null) {
            match.setPhase(request.getPhase());
        }
        if (request.getMatchCode() != null) {
            match.setMatchCode(request.getMatchCode());
        }

        // Set scores first if provided in the request
        if (request.getHomeScore() != null) {
            match.setHomeScore(request.getHomeScore());
        }
        if (request.getAwayScore() != null) {
            match.setAwayScore(request.getAwayScore());
        }

        // Status update logic - validate after scores are set
        if (request.getStatus() != null) {
            if (request.getStatus() == MatchStatus.COMPLETED) {
                // Require scores to be set (either from request or already in entity)
                if (match.getHomeScore() == null || match.getAwayScore() == null) {
                    throw new IllegalArgumentException(
                            "Cannot set status to COMPLETED without home and away scores.");
                }
            }
            match.setStatus(request.getStatus());

            // Decrement suspensions if match is completed
            if (request.getStatus() == MatchStatus.COMPLETED) {
                suspensionService.decrementSuspensions(match);
            }
        }

        Match updatedMatch = matchRepository.save(match);
        auditLogger.logMatchUpdated(updatedMatch, httpRequest);
        return mapToResponse(updatedMatch);
    }

    @Override
    @Transactional
    public void deleteMatch(UUID id) {
        if (!matchRepository.existsById(id)) {
            throw new EntityNotFoundException("Match not found with ID: " + id);
        }
        matchRepository.deleteById(id);
    }

    private MatchResponse mapToResponse(Match match) {
        MatchResponse.MatchResponseBuilder builder = MatchResponse.builder()
                .id(match.getId())
                .tournamentId(match.getTournament().getId())
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .pitch(match.getPitch())
                .status(match.getStatus().name())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .phase(match.getPhase())
                .matchCode(match.getMatchCode());

        if (match.getHomeTeam() != null) {
            builder.homeTeamId(match.getHomeTeam().getId());
            builder.homeTeamName(match.getHomeTeam().getName());
            if (match.getHomeTeam().getOrganisation() != null) {
                builder.homeTeamOrgId(match.getHomeTeam().getOrganisation().getId());
            }
        } else {
            builder.homeTeamName(match.getHomeTeamPlaceholder() != null ? match.getHomeTeamPlaceholder() : "TBD");
        }

        if (match.getAwayTeam() != null) {
            builder.awayTeamId(match.getAwayTeam().getId());
            builder.awayTeamName(match.getAwayTeam().getName());
            if (match.getAwayTeam().getOrganisation() != null) {
                builder.awayTeamOrgId(match.getAwayTeam().getOrganisation().getId());
            }
        } else {
            builder.awayTeamName(match.getAwayTeamPlaceholder() != null ? match.getAwayTeamPlaceholder() : "TBD");
        }

        return builder.build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getMatchesByStatus(String status) {
        MatchStatus matchStatus = MatchStatus.valueOf(status.toUpperCase());
        return matchRepository.findByStatus(matchStatus).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void recalculateMatchScores(UUID matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + matchId));

        List<com.athleticaos.backend.entities.MatchEvent> events = matchEventRepository.findByMatchId(matchId);

        int homeScore = 0;
        int awayScore = 0;

        for (com.athleticaos.backend.entities.MatchEvent event : events) {
            int points = getPointsForEventType(event.getEventType());
            if (event.getTeam().getId().equals(match.getHomeTeam().getId())) {
                homeScore += points;
            } else if (event.getTeam().getId().equals(match.getAwayTeam().getId())) {
                awayScore += points;
            }
        }

        match.setHomeScore(homeScore);
        match.setAwayScore(awayScore);
        matchRepository.save(match);
    }

    private int getPointsForEventType(com.athleticaos.backend.enums.MatchEventType eventType) {
        if (eventType == null)
            return 0;
        switch (eventType) {
            case TRY:
                return 5;
            case CONVERSION:
                return 2;
            case PENALTY:
                return 3;
            case DROP_GOAL:
                return 3;
            default:
                return 0;
        }
    }

    @Override
    @Transactional
    public MatchResponse updateMatchStatus(UUID id, String status, HttpServletRequest httpRequest) {
        Match match = matchRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Match not found with ID: " + id));

        MatchStatus matchStatus;
        try {
            matchStatus = MatchStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid match status: " + status);
        }

        match.setStatus(matchStatus);

        // Decrement suspensions if match is completed
        if (matchStatus == MatchStatus.COMPLETED) {
            if (match.getHomeScore() == null || match.getAwayScore() == null) {
                throw new IllegalArgumentException("Cannot set status to COMPLETED without home and away scores.");
            }
            suspensionService.decrementSuspensions(match);
        }

        Match updatedMatch = matchRepository.save(match);
        return mapToResponse(updatedMatch);
    }
}
