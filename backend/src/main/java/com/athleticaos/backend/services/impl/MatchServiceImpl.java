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
import com.athleticaos.backend.services.MatchService;
import jakarta.persistence.EntityNotFoundException;
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

    @Override
    @Transactional(readOnly = true)
    public List<MatchResponse> getAllMatches() {
        return matchRepository.findAll().stream()
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
    @Transactional
    public MatchResponse createMatch(MatchCreateRequest request) {
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
        return mapToResponse(savedMatch);
    }

    @Override
    @Transactional
    public MatchResponse updateMatch(UUID id, MatchUpdateRequest request) {
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

        // Status update logic
        if (request.getStatus() != null) {
            if (request.getStatus() == MatchStatus.COMPLETED) {
                // Require scores if completing
                if (request.getHomeScore() == null || request.getAwayScore() == null) {
                    // If scores are not provided in this request, check if they are already set?
                    // Or strictly require them in the update request.
                    // Let's check if they are set in the entity or request.
                    Integer newHomeScore = request.getHomeScore() != null ? request.getHomeScore()
                            : match.getHomeScore();
                    Integer newAwayScore = request.getAwayScore() != null ? request.getAwayScore()
                            : match.getAwayScore();

                    if (newHomeScore == null || newAwayScore == null) {
                        throw new IllegalArgumentException(
                                "Cannot set status to COMPLETED without home and away scores.");
                    }
                }
            }
            match.setStatus(request.getStatus());
        }

        if (request.getHomeScore() != null) {
            match.setHomeScore(request.getHomeScore());
        }
        if (request.getAwayScore() != null) {
            match.setAwayScore(request.getAwayScore());
        }

        Match updatedMatch = matchRepository.save(match);
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
        return MatchResponse.builder()
                .id(match.getId())
                .tournamentId(match.getTournament().getId())
                .homeTeamId(match.getHomeTeam().getId())
                .homeTeamName(match.getHomeTeam().getName())
                .awayTeamId(match.getAwayTeam().getId())
                .awayTeamName(match.getAwayTeam().getName())
                .matchDate(match.getMatchDate())
                .kickOffTime(match.getKickOffTime())
                .venue(match.getVenue())
                .pitch(match.getPitch())
                .status(match.getStatus().name())
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .phase(match.getPhase())
                .matchCode(match.getMatchCode())
                .build();
    }
}
