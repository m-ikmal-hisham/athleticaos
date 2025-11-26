package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

        private final MatchRepository matchRepository;
        private final TournamentRepository tournamentRepository;
        private final TeamRepository teamRepository;
        private final MatchEventRepository matchEventRepository;
        private final PlayerRepository playerRepository;

        public List<MatchResponse> getAllMatches() {
                return matchRepository.findAll().stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        @SuppressWarnings("null")
        public MatchResponse getMatchById(UUID id) {
                return matchRepository.findById(id)
                                .map(this::mapToResponse)
                                .orElseThrow(() -> new EntityNotFoundException("Match not found"));
        }

        @Transactional
        @SuppressWarnings("null")
        public MatchResponse createMatch(MatchCreateRequest request) {
                Tournament tournament = tournamentRepository.findById(request.getTournamentId())
                                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

                Team homeTeam = teamRepository.findById(request.getHomeTeamId())
                                .orElseThrow(() -> new EntityNotFoundException("Home Team not found"));

                Team awayTeam = teamRepository.findById(request.getAwayTeamId())
                                .orElseThrow(() -> new EntityNotFoundException("Away Team not found"));

                Match match = Match.builder()
                                .tournament(tournament)
                                .homeTeam(homeTeam)
                                .awayTeam(awayTeam)
                                .status("SCHEDULED")
                                .startTime(request.getStartTime())
                                .fieldNumber(request.getFieldNumber())
                                .build();

                return mapToResponse(matchRepository.save(match));
        }

        @Transactional
        @SuppressWarnings("null")
        public void createMatchEvent(MatchEventCreateRequest request) {
                Match match = matchRepository.findById(request.getMatchId())
                                .orElseThrow(() -> new EntityNotFoundException("Match not found"));

                Player player = null;
                if (request.getPlayerId() != null) {
                        player = playerRepository.findById(request.getPlayerId())
                                        .orElseThrow(() -> new EntityNotFoundException("Player not found"));
                }

                MatchEvent event = MatchEvent.builder()
                                .match(match)
                                .player(player)
                                .eventType(request.getEventType())
                                .minute(request.getMinute())
                                .notes(request.getNotes())
                                .build();

                matchEventRepository.save(event);
        }

        private MatchResponse mapToResponse(Match match) {
                return MatchResponse.builder()
                                .id(match.getId())
                                .tournamentId(match.getTournament().getId())
                                .homeTeamId(match.getHomeTeam().getId())
                                .homeTeamName(match.getHomeTeam().getName())
                                .awayTeamId(match.getAwayTeam().getId())
                                .awayTeamName(match.getAwayTeam().getName())
                                .status(match.getStatus())
                                .startTime(match.getStartTime())
                                .fieldNumber(match.getFieldNumber())
                                .winnerTeamId(match.getWinnerTeam() != null ? match.getWinnerTeam().getId() : null)
                                .build();
        }
}
