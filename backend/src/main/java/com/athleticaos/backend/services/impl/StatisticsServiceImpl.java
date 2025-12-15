package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.stats.PlayerStatsResponse;
import com.athleticaos.backend.dtos.stats.TeamStatsResponse;
import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.dtos.stats.leaderboard.PlayerLeaderboardEntry;
import com.athleticaos.backend.dtos.stats.leaderboard.TeamLeaderboardEntry;
import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.services.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsServiceImpl implements StatisticsService {

        private final MatchRepository matchRepository;
        private final MatchEventRepository matchEventRepository;
        private final TournamentRepository tournamentRepository;

        @Override
        public TournamentStatsSummaryResponse getTournamentSummary(UUID tournamentId) {
                Tournament tournament = tournamentRepository.findById(tournamentId)
                                .orElseThrow(() -> new RuntimeException("Tournament not found")); // Using
                                                                                                  // RuntimeException
                                                                                                  // for now,
                                                                                                  // should be
                                                                                                  // ResourceNotFoundException

                List<Match> matches = matchRepository.findByTournamentId(tournamentId);
                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);

                int totalMatches = matches.size();
                int completedMatches = (int) matches.stream()
                                .filter(m -> m.getStatus() == MatchStatus.COMPLETED)
                                .count();

                int totalTries = (int) events.stream()
                                .filter(e -> e.getEventType() == MatchEventType.TRY)
                                .count();

                int totalYellowCards = (int) events.stream()
                                .filter(e -> e.getEventType() == MatchEventType.YELLOW_CARD)
                                .count();

                int totalRedCards = (int) events.stream()
                                .filter(e -> e.getEventType() == MatchEventType.RED_CARD)
                                .count();

                int totalPoints = events.stream()
                                .mapToInt(this::getPointsForEvent)
                                .sum();

                return new TournamentStatsSummaryResponse(
                                tournament.getId(),
                                tournament.getName(),
                                totalMatches,
                                completedMatches,
                                totalTries,
                                totalPoints,
                                totalYellowCards,
                                totalRedCards);
        }

        @Override
        public List<PlayerStatsResponse> getPlayerStatsForTournament(UUID tournamentId) {
                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);

                // Group events by player ID
                Map<UUID, List<MatchEvent>> eventsByPlayer = events.stream()
                                .filter(e -> e.getPlayer() != null)
                                .collect(Collectors.groupingBy(e -> e.getPlayer().getId()));

                List<PlayerStatsResponse> stats = new ArrayList<>();

                for (Map.Entry<UUID, List<MatchEvent>> entry : eventsByPlayer.entrySet()) {
                        UUID playerId = entry.getKey();
                        List<MatchEvent> playerEvents = entry.getValue();
                        Player player = playerEvents.get(0).getPlayer(); // Assuming player exists
                        String teamName = playerEvents.get(0).getTeam() != null
                                        ? playerEvents.get(0).getTeam().getName()
                                        : null;

                        int tries = countEvents(playerEvents, MatchEventType.TRY);
                        int conversions = countEvents(playerEvents, MatchEventType.CONVERSION);
                        int penalties = countEvents(playerEvents, MatchEventType.PENALTY);
                        int dropGoals = countEvents(playerEvents, MatchEventType.DROP_GOAL);
                        int yellowCards = countEvents(playerEvents, MatchEventType.YELLOW_CARD);
                        int redCards = countEvents(playerEvents, MatchEventType.RED_CARD);

                        int totalPoints = playerEvents.stream().mapToInt(this::getPointsForEvent).sum();

                        // Matches played approximation: distinct match IDs in events
                        // Ideally we'd check lineups, but per prompt we use events or lineups.
                        // Since we don't have lineups yet, we use events.
                        int matchesPlayed = (int) playerEvents.stream()
                                        .map(e -> e.getMatch().getId())
                                        .distinct()
                                        .count();

                        stats.add(new PlayerStatsResponse(
                                        playerId,
                                        player.getPerson().getFirstName(),
                                        player.getPerson().getLastName(),
                                        teamName,
                                        matchesPlayed,
                                        tries,
                                        conversions,
                                        penalties,
                                        dropGoals,
                                        yellowCards,
                                        redCards,
                                        totalPoints));
                }

                return stats;
        }

        @Override
        public List<TeamStatsResponse> getTeamStatsForTournament(UUID tournamentId) {
                List<Match> matches = matchRepository.findByTournamentId(tournamentId);
                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);

                // Identify all teams in the tournament from matches (filter out nulls)
                Set<Team> teams = new HashSet<>();
                matches.forEach(m -> {
                        if (m.getHomeTeam() != null)
                                teams.add(m.getHomeTeam());
                        if (m.getAwayTeam() != null)
                                teams.add(m.getAwayTeam());
                });

                List<TeamStatsResponse> stats = new ArrayList<>();

                for (Team team : teams) {
                        if (team == null)
                                continue; // Extra safety
                        UUID teamId = team.getId();

                        // Filter matches for this team (with null safety)
                        List<Match> teamMatches = matches.stream()
                                        .filter(m -> (m.getHomeTeam() != null && m.getHomeTeam().getId().equals(teamId))
                                                        || (m.getAwayTeam() != null
                                                                        && m.getAwayTeam().getId().equals(teamId)))
                                        .toList();

                        int matchesPlayed = teamMatches.size();
                        int wins = 0;
                        int draws = 0;
                        int losses = 0;
                        int pointsFor = 0;
                        int pointsAgainst = 0;

                        for (Match m : teamMatches) {
                                if (m.getStatus() == MatchStatus.COMPLETED && m.getHomeScore() != null
                                                && m.getAwayScore() != null) {
                                        boolean isHome = m.getHomeTeam() != null
                                                        && m.getHomeTeam().getId().equals(teamId);
                                        int scoreFor = isHome ? m.getHomeScore() : m.getAwayScore();
                                        int scoreAgainst = isHome ? m.getAwayScore() : m.getHomeScore();

                                        pointsFor += scoreFor;
                                        pointsAgainst += scoreAgainst;

                                        if (scoreFor > scoreAgainst)
                                                wins++;
                                        else if (scoreFor == scoreAgainst)
                                                draws++;
                                        else
                                                losses++;
                                }
                        }

                        int pointsDifference = pointsFor - pointsAgainst;

                        // Events for this team
                        List<MatchEvent> teamEvents = events.stream()
                                        .filter(e -> e.getTeam().getId().equals(teamId))
                                        .toList();

                        int triesScored = countEvents(teamEvents, MatchEventType.TRY);
                        int yellowCards = countEvents(teamEvents, MatchEventType.YELLOW_CARD);
                        int redCards = countEvents(teamEvents, MatchEventType.RED_CARD);

                        // Table points: Win=4, Draw=2, Loss=0
                        int tablePoints = (wins * 4) + (draws * 2);

                        stats.add(new TeamStatsResponse(
                                        teamId,
                                        team.getName(),
                                        team.getOrganisation() != null ? team.getOrganisation().getName() : null,
                                        matchesPlayed,
                                        wins,
                                        draws,
                                        losses,
                                        pointsFor,
                                        pointsAgainst,
                                        pointsDifference,
                                        triesScored,
                                        yellowCards,
                                        redCards,
                                        tablePoints));
                }

                return stats;
        }

        @Override
        public TournamentLeaderboardResponse getTournamentLeaderboard(UUID tournamentId) {
                TournamentStatsSummaryResponse summary = getTournamentSummary(tournamentId);
                List<PlayerStatsResponse> playerStats = getPlayerStatsForTournament(tournamentId);
                List<TeamStatsResponse> teamStats = getTeamStatsForTournament(tournamentId);

                // Top Players: Tries desc, then Points desc
                List<PlayerLeaderboardEntry> topPlayers = playerStats.stream()
                                .sorted(Comparator.comparingInt(PlayerStatsResponse::tries).reversed()
                                                .thenComparingInt(PlayerStatsResponse::totalPoints).reversed())
                                .limit(10)
                                .map(p -> new PlayerLeaderboardEntry(
                                                p.playerId(),
                                                p.firstName(),
                                                p.lastName(),
                                                p.teamName(),
                                                p.tries(),
                                                p.totalPoints()))
                                .toList();

                // Top Teams: TablePoints desc, Wins desc, PointsDiff desc
                List<TeamLeaderboardEntry> topTeams = teamStats.stream()
                                .sorted(Comparator.comparingInt(TeamStatsResponse::tablePoints).reversed()
                                                .thenComparingInt(TeamStatsResponse::wins).reversed()
                                                .thenComparingInt(TeamStatsResponse::pointsDifference).reversed())
                                .map(t -> new TeamLeaderboardEntry(
                                                t.teamId(),
                                                t.teamName(),
                                                t.organisationName(),
                                                t.wins(),
                                                t.triesScored(),
                                                t.tablePoints()))
                                .toList();

                return new TournamentLeaderboardResponse(summary, topPlayers, topTeams);
        }

        @Override
        public PlayerStatsResponse getPlayerStatsAcrossTournaments(UUID playerId) {
                // TODO: Implement across tournaments
                return null;
        }

        @Override
        public TeamStatsResponse getTeamStatsAcrossTournaments(UUID teamId) {
                // TODO: Implement across tournaments
                return null;
        }

        private int countEvents(List<MatchEvent> events, MatchEventType type) {
                return (int) events.stream().filter(e -> e.getEventType() == type).count();
        }

        private int getPointsForEvent(MatchEvent event) {
                return switch (event.getEventType()) {
                        case TRY -> 5;
                        case CONVERSION -> 2;
                        case PENALTY -> 3;
                        case DROP_GOAL -> 3;
                        default -> 0;
                };
        }
}
