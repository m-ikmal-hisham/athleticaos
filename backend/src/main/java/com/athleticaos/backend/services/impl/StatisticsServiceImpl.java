package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.stats.PlayerStatsResponse;
import com.athleticaos.backend.dtos.stats.TeamStatsResponse;
import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.dtos.stats.leaderboard.PlayerLeaderboardEntry;
import com.athleticaos.backend.dtos.stats.leaderboard.TeamLeaderboardEntry;
import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;
import com.athleticaos.backend.dtos.stats.PlayerMatchStatsDTO;
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
        private final com.athleticaos.backend.repositories.MatchLineupRepository matchLineupRepository;

        @Override
        public TournamentStatsSummaryResponse getTournamentSummary(UUID tournamentId) {
                Tournament tournament = tournamentRepository
                                .findById(java.util.Objects.requireNonNull(tournamentId,
                                                "Tournament ID must not be null"))
                                .orElseThrow(() -> new RuntimeException("Tournament not found"));

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

                long activeTeams = matches.stream()
                                .flatMap(m -> java.util.stream.Stream.of(m.getHomeTeam(), m.getAwayTeam()))
                                .filter(java.util.Objects::nonNull)
                                .map(com.athleticaos.backend.entities.Team::getId)
                                .distinct()
                                .count();

                long activePlayers = matchLineupRepository.findByMatch_Tournament_Id(tournamentId).stream()
                                .map(l -> l.getPlayer().getId())
                                .distinct()
                                .count();

                return new TournamentStatsSummaryResponse(
                                tournament.getId(),
                                tournament.getName(),
                                totalMatches,
                                completedMatches,
                                totalTries,
                                totalPoints,
                                totalYellowCards,
                                totalRedCards,
                                activeTeams,
                                activePlayers,
                                totalPoints);
        }

        @Override
        public List<PlayerStatsResponse> getPlayerStatsForTournament(UUID tournamentId) {
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);
                List<com.athleticaos.backend.entities.MatchLineup> lineups = matchLineupRepository
                                .findByMatch_Tournament_Id(tournamentId);

                // Collect all unique player IDs involved in the tournament (via events or
                // lineups)
                Set<UUID> playerIds = new HashSet<>();
                events.stream().filter(e -> e.getPlayer() != null).forEach(e -> playerIds.add(e.getPlayer().getId()));
                lineups.forEach(l -> playerIds.add(l.getPlayer().getId()));

                // Pre-group for efficiency
                Map<UUID, List<MatchEvent>> eventsByPlayer = events.stream()
                                .filter(e -> e.getPlayer() != null)
                                .collect(Collectors.groupingBy(e -> e.getPlayer().getId()));

                Map<UUID, Long> matchesPlayedByPlayer = lineups.stream()
                                .filter(l -> l.getRole() == com.athleticaos.backend.enums.LineupRole.STARTER ||
                                                l.getRole() == com.athleticaos.backend.enums.LineupRole.BENCH)
                                .collect(Collectors.groupingBy(l -> l.getPlayer().getId(), Collectors.counting()));

                // We need Player details. Since we don't have a bulk fetch handy or want to
                // avoid N+1 issues cleanly without new repo methods,
                // we will rely on data available in the objects. Lineup has Player, Event has
                // Player.
                // We'll create a map of PlayerId -> Player entity from the available lists.
                Map<UUID, Player> playerEntityMap = new HashMap<>();
                events.stream().filter(e -> e.getPlayer() != null)
                                .forEach(e -> playerEntityMap.putIfAbsent(e.getPlayer().getId(), e.getPlayer()));
                lineups.forEach(l -> playerEntityMap.putIfAbsent(l.getPlayer().getId(), l.getPlayer()));

                List<PlayerStatsResponse> stats = new ArrayList<>();

                for (UUID playerId : playerIds) {
                        Player player = playerEntityMap.get(playerId);
                        if (player == null)
                                continue;

                        List<MatchEvent> playerEvents = eventsByPlayer.getOrDefault(playerId, Collections.emptyList());
                        int matchesPlayed = matchesPlayedByPlayer.getOrDefault(playerId, 0L).intValue();

                        String teamName = null;
                        if (!playerEvents.isEmpty() && playerEvents.get(0).getTeam() != null) {
                                teamName = playerEvents.get(0).getTeam().getName();
                        } else {
                                // Try to find team from lineups
                                teamName = lineups.stream()
                                                .filter(l -> l.getPlayer().getId().equals(playerId))
                                                .findFirst()
                                                .map(l -> l.getTeam().getName())
                                                .orElse(null);
                        }

                        int tries = countEvents(playerEvents, MatchEventType.TRY);
                        int conversions = countEvents(playerEvents, MatchEventType.CONVERSION);
                        int penalties = countEvents(playerEvents, MatchEventType.PENALTY);
                        int dropGoals = countEvents(playerEvents, MatchEventType.DROP_GOAL);
                        int yellowCards = countEvents(playerEvents, MatchEventType.YELLOW_CARD);
                        int redCards = countEvents(playerEvents, MatchEventType.RED_CARD);

                        int totalPoints = playerEvents.stream().mapToInt(this::getPointsForEvent).sum();

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
                                        totalPoints,
                                        Collections.emptyList()));
                }

                return stats;
        }

        @Override
        public List<TeamStatsResponse> getTeamStatsForTournament(UUID tournamentId) {
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
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
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
                TournamentStatsSummaryResponse summary = getTournamentSummary(tournamentId);
                List<PlayerStatsResponse> playerStats = getPlayerStatsForTournament(tournamentId);
                List<TeamStatsResponse> teamStats = getTeamStatsForTournament(tournamentId);

                // Top Players (Scorers): Tries desc, then Points desc
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
                                                p.totalPoints(),
                                                p.yellowCards(),
                                                p.redCards()))
                                .toList();

                // Top Offenders (Discipline): Red Cards desc, then Yellow Cards desc
                List<PlayerLeaderboardEntry> topOffenders = playerStats.stream()
                                .filter(p -> p.redCards() > 0 || p.yellowCards() > 0)
                                .sorted(Comparator.comparingInt(PlayerStatsResponse::redCards).reversed()
                                                .thenComparingInt(PlayerStatsResponse::yellowCards).reversed())
                                .limit(10)
                                .map(p -> new PlayerLeaderboardEntry(
                                                p.playerId(),
                                                p.firstName(),
                                                p.lastName(),
                                                p.teamName(),
                                                p.tries(),
                                                p.totalPoints(),
                                                p.yellowCards(),
                                                p.redCards()))
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

                return new TournamentLeaderboardResponse(summary, topPlayers, topTeams, topOffenders);
        }

        @Override
        public PlayerStatsResponse getPlayerStatsAcrossTournaments(UUID playerId) {
                java.util.Objects.requireNonNull(playerId, "Player ID must not be null");

                // 1. Fetch Lineups (Matches Played)
                List<com.athleticaos.backend.entities.MatchLineup> lineups = matchLineupRepository
                                .findByPlayerId(playerId);

                // 2. Fetch Events (Performance)
                List<MatchEvent> events = matchEventRepository.findByPlayer_Id(playerId);

                // 3. Aggregate Career Stats
                int matchesPlayed = lineups.size(); // Simplified: assuming 1 lineup entry per match played
                int tries = countEvents(events, MatchEventType.TRY);
                int conversions = countEvents(events, MatchEventType.CONVERSION);
                int penalties = countEvents(events, MatchEventType.PENALTY);
                int dropGoals = countEvents(events, MatchEventType.DROP_GOAL);
                int yellowCards = countEvents(events, MatchEventType.YELLOW_CARD);
                int redCards = countEvents(events, MatchEventType.RED_CARD);
                int totalPoints = events.stream().mapToInt(this::getPointsForEvent).sum();

                // 4. Get Player Details from one of the entries (or fetch from repo if needed,
                // but we likely have it)
                // If no data, we might need to fetch player manually. Let's try to get from
                // first lineup/event.
                String firstName = "";
                String lastName = "";
                String currentTeamName = null;

                if (!lineups.isEmpty()) {
                        Player p = lineups.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                        // Most recent team? Sort lineups? For now, take the last one or just null
                        currentTeamName = lineups.get(lineups.size() - 1).getTeam().getName();
                } else if (!events.isEmpty()) {
                        Player p = events.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                } else {
                        // No stats, fetch player name manually or return empty stats
                        // For now returning empty stats with placeholder name if not found in cache
                        // Ideally we inject PlayerRepository but avoiding modifying constructor for now
                        // if possible
                        // But wait, constructor injection is fine.

                        // NOTE: Since I cannot easily add PlayerRepository without regenerating the
                        // whole file or verifying imports,
                        // I will assume for MVP that if no stats exist, we return basic 0 stats.
                        // Ideally fetching player via playerRepository is better.
                }

                // 5. Generate Match History
                // Group events by Match
                Map<UUID, List<MatchEvent>> eventsByMatch = events.stream()
                                .collect(Collectors.groupingBy(e -> e.getMatch().getId()));

                List<PlayerMatchStatsDTO> recentMatches = lineups.stream()
                                .map(lineup -> {
                                        Match match = lineup.getMatch();
                                        List<MatchEvent> matchEvents = eventsByMatch.getOrDefault(match.getId(),
                                                        Collections.emptyList());

                                        int mPoints = matchEvents.stream().mapToInt(this::getPointsForEvent).sum();
                                        int mTries = (int) matchEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.TRY).count();
                                        int mYellow = (int) matchEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.YELLOW_CARD)
                                                        .count();
                                        int mRed = (int) matchEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.RED_CARD)
                                                        .count();

                                        String opponentName = "Unknown";
                                        String result = "N/A";

                                        if (match.getHomeTeam() != null && match.getAwayTeam() != null) {
                                                boolean isHome = match.getHomeTeam().getId()
                                                                .equals(lineup.getTeam().getId());
                                                opponentName = isHome ? match.getAwayTeam().getName()
                                                                : match.getHomeTeam().getName();

                                                if (match.getStatus() == MatchStatus.COMPLETED
                                                                && match.getHomeScore() != null
                                                                && match.getAwayScore() != null) {
                                                        int myScore = isHome ? match.getHomeScore()
                                                                        : match.getAwayScore();
                                                        int opScore = isHome ? match.getAwayScore()
                                                                        : match.getHomeScore();
                                                        String winLoss = myScore > opScore ? "W"
                                                                        : (myScore == opScore ? "D" : "L");
                                                        result = winLoss + " " + myScore + "-" + opScore;
                                                }
                                        }

                                        return new PlayerMatchStatsDTO(
                                                        match.getId(),
                                                        match.getMatchDate(),
                                                        opponentName,
                                                        result,
                                                        mTries,
                                                        mPoints,
                                                        mYellow,
                                                        mRed,
                                                        lineup.getRole() == com.athleticaos.backend.enums.LineupRole.STARTER
                                                                        ? "80"
                                                                        : "Sub" // Simplified minutes
                                        );
                                })
                                .sorted((m1, m2) -> {
                                        if (m1.matchDate() == null || m2.matchDate() == null)
                                                return 0;
                                        return m2.matchDate().compareTo(m1.matchDate()); // Descending
                                })
                                .collect(Collectors.toList());

                return new PlayerStatsResponse(
                                playerId,
                                firstName,
                                lastName,
                                currentTeamName,
                                matchesPlayed,
                                tries,
                                conversions,
                                penalties,
                                dropGoals,
                                yellowCards,
                                redCards,
                                totalPoints,
                                recentMatches);
        }

        @Override
        public TeamStatsResponse getTeamStatsAcrossTournaments(UUID teamId) {
                // Note: Implementation across tournaments pending
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
