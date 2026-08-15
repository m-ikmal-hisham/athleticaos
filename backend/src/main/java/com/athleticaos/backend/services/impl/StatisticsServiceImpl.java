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
        private final com.athleticaos.backend.repositories.TournamentFormatConfigRepository formatConfigRepository;
        private final com.athleticaos.backend.repositories.TeamRepository teamRepository;

        @Override
        public TournamentStatsSummaryResponse getTournamentSummary(UUID tournamentId, UUID categoryId) {
                Tournament tournament = tournamentRepository
                                .findById(java.util.Objects.requireNonNull(tournamentId,
                                                "Tournament ID must not be null"))
                                .orElseThrow(() -> new RuntimeException("Tournament not found"));

                // Efficiently count matches via SQL
                int totalMatches = (int) matchRepository.countMatchesByTournamentId(tournamentId, categoryId,
                                categoryId == null);
                int completedMatches = (int) matchRepository.countCompletedMatchesByTournamentId(tournamentId,
                                categoryId, categoryId == null);

                // Efficiently count events via SQL
                int totalTries = (int) matchEventRepository.countByTournamentIdAndEventType(tournamentId,
                                MatchEventType.TRY, categoryId, categoryId == null);
                int totalYellowCards = (int) matchEventRepository.countByTournamentIdAndEventType(tournamentId,
                                MatchEventType.YELLOW_CARD, categoryId, categoryId == null);
                int totalRedCards = (int) matchEventRepository.countByTournamentIdAndEventType(tournamentId,
                                MatchEventType.RED_CARD, categoryId, categoryId == null);
                int totalConversions = (int) matchEventRepository.countByTournamentIdAndEventType(tournamentId,
                                MatchEventType.CONVERSION, categoryId, categoryId == null);
                int totalPenalties = (int) matchEventRepository.countByTournamentIdAndEventType(tournamentId,
                                MatchEventType.PENALTY, categoryId, categoryId == null);

                // Efficiently sum points via SQL
                int totalPoints = (int) matchEventRepository.sumPointsByTournamentId(tournamentId, categoryId,
                                categoryId == null);

                // Efficiently count active participants via SQL
                long activeTeams = matchRepository.countActiveTeamsByTournamentId(tournamentId, categoryId,
                                categoryId == null);
                long activePlayers = matchLineupRepository.countDistinctPlayersByTournamentId(tournamentId, categoryId,
                                categoryId == null);

                return new TournamentStatsSummaryResponse(
                                tournament.getId(),
                                tournament.getName(),
                                totalMatches,
                                completedMatches,
                                totalTries,
                                totalPoints,
                                totalYellowCards,
                                totalRedCards,
                                totalConversions,
                                totalPenalties,
                                activeTeams,
                                activePlayers,
                                totalPoints);
        }

        @Override
        public List<PlayerStatsResponse> getPlayerStatsForTournament(UUID tournamentId, UUID categoryId) {
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);
                List<com.athleticaos.backend.entities.MatchLineup> lineups = matchLineupRepository
                                .findByMatch_Tournament_Id(tournamentId);

                // Filter by category
                if (categoryId != null) {
                        events = events.stream()
                                        .filter(e -> e.getMatch().getStage() == null ||
                                                        e.getMatch().getStage().getCategory() == null ||
                                                        e.getMatch().getStage().getCategory().getId()
                                                                        .equals(categoryId))
                                        .collect(Collectors.toList());

                        lineups = lineups.stream()
                                        .filter(l -> l.getMatch().getStage() == null ||
                                                        l.getMatch().getStage().getCategory() == null ||
                                                        l.getMatch().getStage().getCategory().getId()
                                                                        .equals(categoryId))
                                        .collect(Collectors.toList());
                }

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
                                        0, // totalMinutesPlayed not calculated for tournament summary view
                                        Collections.emptyList()));
                }

                return stats;
        }

        @Override
        public List<TeamStatsResponse> getTeamStatsForTournament(UUID tournamentId, UUID categoryId) {
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
                List<Match> matches = matchRepository.findByTournamentId(tournamentId);

                int pointsWin = 4;
                int pointsDraw = 2;
                int pointsLoss = 0;

                com.athleticaos.backend.entities.TournamentFormatConfig formatConfig = null;
                if (categoryId != null) {
                        formatConfig = formatConfigRepository.findByTournamentIdAndCategoryId(tournamentId, categoryId).orElse(null);
                }
                if (formatConfig == null) {
                        formatConfig = formatConfigRepository.findByTournamentIdAndCategoryIsNull(tournamentId).orElse(null);
                }
                
                if (formatConfig != null) {
                        pointsWin = formatConfig.getPointsWin() != null ? formatConfig.getPointsWin() : 4;
                        pointsDraw = formatConfig.getPointsDraw() != null ? formatConfig.getPointsDraw() : 2;
                        pointsLoss = formatConfig.getPointsLoss() != null ? formatConfig.getPointsLoss() : 0;
                }

                // Filter matches
                if (categoryId != null) {
                        matches = matches.stream()
                                        .filter(m -> m.getStage() == null || m.getStage().getCategory() == null ||
                                                        m.getStage().getCategory().getId().equals(categoryId))
                                        .collect(Collectors.toList());
                }

                List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);
                // Filter events
                if (categoryId != null) {
                        Set<UUID> matchIds = matches.stream().map(m -> m.getId()).collect(Collectors.toSet());
                        events = events.stream()
                                        .filter(e -> matchIds.contains(e.getMatch().getId()))
                                        .collect(Collectors.toList());
                }

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
                        int conversions = countEvents(teamEvents, MatchEventType.CONVERSION);
                        int penalties = countEvents(teamEvents, MatchEventType.PENALTY);
                        int dropGoals = countEvents(teamEvents, MatchEventType.DROP_GOAL);
                        int yellowCards = countEvents(teamEvents, MatchEventType.YELLOW_CARD);
                        int redCards = countEvents(teamEvents, MatchEventType.RED_CARD);

                        // Table points calculated dynamically based on format config
                        int tablePoints = (wins * pointsWin) + (draws * pointsDraw) + (losses * pointsLoss);

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
                                        conversions,
                                        penalties,
                                        dropGoals,
                                        yellowCards,
                                        redCards,
                                        tablePoints));
                }

                return stats;
        }

        @Override
        public TournamentLeaderboardResponse getTournamentLeaderboard(UUID tournamentId, UUID categoryId) {
                java.util.Objects.requireNonNull(tournamentId, "Tournament ID must not be null");
                TournamentStatsSummaryResponse summary = getTournamentSummary(tournamentId, categoryId);
                List<PlayerStatsResponse> playerStats = getPlayerStatsForTournament(tournamentId, categoryId);
                List<TeamStatsResponse> teamStats = getTeamStatsForTournament(tournamentId, categoryId);

                // Top Players (Scorers): Total Points desc, then Tries desc
                List<PlayerLeaderboardEntry> topPlayers = playerStats.stream()
                                .sorted(Comparator.comparingInt((PlayerStatsResponse p) -> p.totalPoints()).reversed()
                                                .thenComparing(Comparator.comparingInt((PlayerStatsResponse p) -> p.tries())
                                                                .reversed()))
                                .map(p -> new PlayerLeaderboardEntry(
                                                p.playerId(),
                                                p.firstName(),
                                                p.lastName(),
                                                p.teamName(),
                                                p.tries(),
                                                p.conversions(),
                                                p.penalties(),
                                                p.dropGoals(),
                                                p.totalPoints(),
                                                p.yellowCards(),
                                                p.redCards()))
                                .toList();

                // Top Offenders (Discipline): Red Cards desc, then Yellow Cards desc
                List<PlayerLeaderboardEntry> topOffenders = playerStats.stream()
                                .filter(p -> p.redCards() > 0 || p.yellowCards() > 0)
                                .sorted(Comparator.comparingInt((PlayerStatsResponse p) -> p.redCards()).reversed()
                                                .thenComparing(Comparator.comparingInt((PlayerStatsResponse p) -> p.yellowCards())
                                                                .reversed()))
                                .map(p -> new PlayerLeaderboardEntry(
                                                p.playerId(),
                                                p.firstName(),
                                                p.lastName(),
                                                p.teamName(),
                                                p.tries(),
                                                p.conversions(),
                                                p.penalties(),
                                                p.dropGoals(),
                                                p.totalPoints(),
                                                p.yellowCards(),
                                                p.redCards()))
                                .toList();

                // Top Try Scorers: Tries desc, then Total Points desc
                List<PlayerLeaderboardEntry> topTryScorers = playerStats.stream()
                                .filter(p -> p.tries() > 0)
                                .sorted(Comparator.comparingInt((PlayerStatsResponse p) -> p.tries()).reversed()
                                                .thenComparing(Comparator.comparingInt((PlayerStatsResponse p) -> p.totalPoints())
                                                                .reversed()))
                                .map(p -> new PlayerLeaderboardEntry(
                                                p.playerId(),
                                                p.firstName(),
                                                p.lastName(),
                                                p.teamName(),
                                                p.tries(),
                                                p.conversions(),
                                                p.penalties(),
                                                p.dropGoals(),
                                                p.totalPoints(),
                                                p.yellowCards(),
                                                p.redCards()))
                                .toList();

                // Top Teams: TablePoints desc, Wins desc, PointsDiff desc
                List<TeamLeaderboardEntry> topTeams = teamStats.stream()
                                .sorted(Comparator.comparingInt((TeamStatsResponse t) -> t.tablePoints()).reversed()
                                                .thenComparing(Comparator.comparingInt((TeamStatsResponse t) -> t.wins())
                                                                .reversed())
                                                .thenComparing(Comparator
                                                                .comparingInt((TeamStatsResponse t) -> t.pointsDifference())
                                                                .reversed()))
                                .map(t -> new TeamLeaderboardEntry(
                                                t.teamId(),
                                                t.teamName(),
                                                t.organisationName(),
                                                t.wins(),
                                                t.triesScored(),
                                                t.pointsFor(),
                                                t.pointsDifference(),
                                                t.tablePoints()))
                                .toList();

                return new TournamentLeaderboardResponse(summary, topPlayers, topTeams, topOffenders, topTryScorers);
        }

        @Override
        public PlayerStatsResponse getPlayerStatsAcrossTournaments(UUID playerId) {
                java.util.Objects.requireNonNull(playerId, "Player ID must not be null");

                // 1. Fetch Lineups (Matches Played)
                List<com.athleticaos.backend.entities.MatchLineup> lineups = matchLineupRepository
                                .findByPlayerId(playerId);

                // 2. Fetch Events where this player is the primary player (for scoring stats)
                List<MatchEvent> playerEvents = matchEventRepository.findByPlayer_Id(playerId);

                // 3. Aggregate Career Stats (only count events where player is the primary actor)
                int tries = countEvents(playerEvents, MatchEventType.TRY);
                int conversions = countEvents(playerEvents, MatchEventType.CONVERSION);
                int penalties = countEvents(playerEvents, MatchEventType.PENALTY);
                int dropGoals = countEvents(playerEvents, MatchEventType.DROP_GOAL);
                int yellowCards = countEvents(playerEvents, MatchEventType.YELLOW_CARD);
                int redCards = countEvents(playerEvents, MatchEventType.RED_CARD);
                int totalPoints = playerEvents.stream().mapToInt(this::getPointsForEvent).sum();

                // 4. Get Player Details
                String firstName = "";
                String lastName = "";
                String currentTeamName = null;

                if (!lineups.isEmpty()) {
                        Player p = lineups.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                        // Get the team from the most relevant tournament:
                        // 1. Prefer teams from active (LIVE/PUBLISHED) tournaments
                        // 2. Fall back to the most recent match date
                        currentTeamName = lineups.stream()
                                        .filter(l -> l.getMatch() != null && l.getMatch().getTournament() != null)
                                        .filter(l -> {
                                                var status = l.getMatch().getTournament().getStatus();
                                                return status == com.athleticaos.backend.enums.TournamentStatus.LIVE
                                                        || status == com.athleticaos.backend.enums.TournamentStatus.PUBLISHED;
                                        })
                                        .sorted((l1, l2) -> {
                                                // Prefer LIVE over PUBLISHED
                                                var s1 = l1.getMatch().getTournament().getStatus();
                                                var s2 = l2.getMatch().getTournament().getStatus();
                                                if (s1 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s2 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return -1;
                                                if (s2 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s1 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return 1;
                                                var d1 = l1.getMatch().getMatchDate();
                                                var d2 = l2.getMatch().getMatchDate();
                                                if (d1 == null || d2 == null) return 0;
                                                return d2.compareTo(d1);
                                        })
                                        .findFirst()
                                        .map(l -> l.getTeam().getName())
                                        .orElseGet(() ->
                                                // No active tournament — fall back to most recent match
                                                lineups.stream()
                                                        .filter(l -> l.getMatch() != null && l.getMatch().getMatchDate() != null)
                                                        .sorted((l1, l2) -> l2.getMatch().getMatchDate().compareTo(l1.getMatch().getMatchDate()))
                                                        .findFirst()
                                                        .map(l -> l.getTeam().getName())
                                                        .orElse(null)
                                        );
                } else if (!playerEvents.isEmpty()) {
                        Player p = playerEvents.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                }

                // 5. Generate Match History
                // Group player events by Match (for scoring stats per match)
                Map<UUID, List<MatchEvent>> playerEventsByMatch = playerEvents.stream()
                                .collect(Collectors.groupingBy(e -> e.getMatch().getId()));

                // Cache of all match events (including substitution events where player is relatedPlayer)
                Map<UUID, List<MatchEvent>> allMatchEventsCache = new HashMap<>();

                List<PlayerMatchStatsDTO> recentMatches = lineups.stream()
                                .map(lineup -> {
                                        Match match = lineup.getMatch();
                                        // Player-specific events for scoring stats
                                        List<MatchEvent> matchPlayerEvents = playerEventsByMatch
                                                        .getOrDefault(match.getId(), new ArrayList<>());

                                        // ALL events for this match (needed for correct minutes calculation)
                                        List<MatchEvent> allMatchEvents = allMatchEventsCache.computeIfAbsent(
                                                        match.getId(),
                                                        id -> matchEventRepository.findAllByMatchIdIncludingDeleted(id));

                                        int mPoints = matchPlayerEvents.stream()
                                                        .mapToInt(this::getPointsForEvent).sum();
                                        int mTries = (int) matchPlayerEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.TRY).count();
                                        int mYellow = (int) matchPlayerEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.YELLOW_CARD)
                                                        .count();
                                        int mRed = (int) matchPlayerEvents.stream()
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

                                        int duration = 80; // Default
                                        if (match.getTournament() != null) {
                                                UUID catId = (match.getStage() != null
                                                                && match.getStage().getCategory() != null)
                                                                                ? match.getStage().getCategory().getId()
                                                                                : (match.getCategory() != null
                                                                                                ? match.getCategory()
                                                                                                                .getId()
                                                                                                : null);
                                                com.athleticaos.backend.entities.TournamentFormatConfig config = match
                                                                .getTournament().getFormatConfig(catId);
                                                if (config != null) {
                                                        duration = config.getMatchDurationMinutes();
                                                }
                                        }

                                        // Determine original starting state from events, not from
                                        // (potentially mutated) lineup role.
                                        // If ANY substitution event has this player as relatedPlayer
                                        // (i.e. they were subbed IN), they originally started on bench.
                                        boolean wasSubbedIn = allMatchEvents.stream()
                                                        .anyMatch(e -> e.getEventType() == MatchEventType.SUBSTITUTION
                                                                        && e.getRelatedPlayer() != null
                                                                        && e.getRelatedPlayer().getId()
                                                                                        .equals(playerId));

                                        // If the player was subbed in, their original role was BENCH
                                        // If they were NOT subbed in and are in the lineup, they were a
                                        // STARTER
                                        // (unless they're bench and never entered = DNP)
                                        boolean wasOriginallyStarter;
                                        if (wasSubbedIn) {
                                                wasOriginallyStarter = false; // They came off the bench
                                        } else {
                                                // Check if they were subbed OUT (meaning they were a
                                                // starter who got replaced)
                                                boolean wasSubbedOut = allMatchEvents.stream()
                                                                .anyMatch(e -> e.getEventType() == MatchEventType.SUBSTITUTION
                                                                                && e.getPlayer() != null
                                                                                && e.getPlayer().getId()
                                                                                                .equals(playerId));
                                                if (wasSubbedOut) {
                                                        wasOriginallyStarter = true; // Started and got subbed
                                                                                     // out
                                                } else {
                                                        // No substitution events involving this player at all
                                                        // Use lineup role but prefer original intention:
                                                        // STARTER = played full match, BENCH = DNP
                                                        wasOriginallyStarter = lineup
                                                                        .getRole() == com.athleticaos.backend.enums.LineupRole.STARTER
                                                                        || lineup.isStarter();
                                                }
                                        }

                                        com.athleticaos.backend.enums.LineupRole effectiveRole = wasOriginallyStarter
                                                        ? com.athleticaos.backend.enums.LineupRole.STARTER
                                                        : com.athleticaos.backend.enums.LineupRole.BENCH;

                                        int minutesPlayedVal = calculateMinutesPlayed(match, playerId,
                                                        effectiveRole, allMatchEvents, duration);
                                        String minutesStr = String.valueOf(minutesPlayedVal);
                                        if (!wasOriginallyStarter && minutesPlayedVal > 0) {
                                                minutesStr += " (Sub)";
                                        } else if (minutesPlayedVal == 0
                                                        && effectiveRole == com.athleticaos.backend.enums.LineupRole.BENCH) {
                                                minutesStr = "DNP";
                                        }

                                        // Team and tournament info
                                        String teamName = lineup.getTeam() != null
                                                        ? lineup.getTeam().getName()
                                                        : null;
                                        String tournamentName = match.getTournament() != null
                                                        ? match.getTournament().getName()
                                                        : null;
                                        UUID tId = match.getTournament() != null
                                                        ? match.getTournament().getId()
                                                        : null;
                                        String tStatus = match.getTournament() != null && match.getTournament().getStatus() != null
                                                        ? match.getTournament().getStatus().name()
                                                        : null;

                                        return new PlayerMatchStatsDTO(
                                                        match.getId(),
                                                        match.getMatchDate(),
                                                        opponentName,
                                                        result,
                                                        mTries,
                                                        mPoints,
                                                        mYellow,
                                                        mRed,
                                                        minutesStr,
                                                        teamName,
                                                        tournamentName,
                                                        tId,
                                                        tStatus);
                                })
                                .sorted((m1, m2) -> {
                                        if (m1.matchDate() == null || m2.matchDate() == null)
                                                return 0;
                                        return m2.matchDate().compareTo(m1.matchDate()); // Descending
                                })
                                .collect(Collectors.toList());

                // Calculate accurate matches played (excluding DNP)
                int matchesPlayed = (int) recentMatches.stream()
                                .filter(m -> !m.minutesPlayed().equals("DNP"))
                                .count();

                // Calculate total minutes played
                int totalMinutesPlayed = recentMatches.stream()
                                .mapToInt(m -> {
                                        try {
                                                String minStr = m.minutesPlayed().split(" ")[0]; // Handle "20 (Sub)" or
                                                                                                 // "DNP"
                                                if (minStr.equals("DNP"))
                                                        return 0;
                                                return Integer.parseInt(minStr);
                                        } catch (NumberFormatException e) {
                                                return 0;
                                        }
                                })
                                .sum();

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
                                totalMinutesPlayed,
                                recentMatches);
        }

        @Override
        public PlayerStatsResponse getPlayerStats(UUID playerId, UUID tournamentId) {
                if (tournamentId == null) {
                        return getPlayerStatsAcrossTournaments(playerId);
                }

                java.util.Objects.requireNonNull(playerId, "Player ID must not be null");

                // 1. Fetch Lineups filtered to this tournament
                List<com.athleticaos.backend.entities.MatchLineup> allLineups = matchLineupRepository
                                .findByPlayerId(playerId);
                List<com.athleticaos.backend.entities.MatchLineup> lineups = allLineups.stream()
                                .filter(l -> l.getMatch() != null && l.getMatch().getTournament() != null
                                                && l.getMatch().getTournament().getId().equals(tournamentId))
                                .collect(Collectors.toList());

                // 2. Fetch Events filtered to this tournament
                List<MatchEvent> allPlayerEvents = matchEventRepository.findByPlayer_Id(playerId);
                List<MatchEvent> playerEvents = allPlayerEvents.stream()
                                .filter(e -> e.getMatch() != null && e.getMatch().getTournament() != null
                                                && e.getMatch().getTournament().getId().equals(tournamentId))
                                .collect(Collectors.toList());

                // 3. Aggregate Stats
                int tries = countEvents(playerEvents, MatchEventType.TRY);
                int conversions = countEvents(playerEvents, MatchEventType.CONVERSION);
                int penalties = countEvents(playerEvents, MatchEventType.PENALTY);
                int dropGoals = countEvents(playerEvents, MatchEventType.DROP_GOAL);
                int yellowCards = countEvents(playerEvents, MatchEventType.YELLOW_CARD);
                int redCards = countEvents(playerEvents, MatchEventType.RED_CARD);
                int totalPoints = playerEvents.stream().mapToInt(this::getPointsForEvent).sum();

                // 4. Get Player Details
                String firstName = "";
                String lastName = "";
                String currentTeamName = null;

                if (!lineups.isEmpty()) {
                        Player p = lineups.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                        // For tournament-scoped, use the team from this tournament's lineups
                        currentTeamName = lineups.stream()
                                        .filter(l -> l.getTeam() != null)
                                        .findFirst()
                                        .map(l -> l.getTeam().getName())
                                        .orElse(null);
                } else if (!playerEvents.isEmpty()) {
                        Player p = playerEvents.get(0).getPlayer();
                        firstName = p.getPerson().getFirstName();
                        lastName = p.getPerson().getLastName();
                }

                // 5. Generate Match History (tournament-scoped)
                Map<UUID, List<MatchEvent>> playerEventsByMatch = playerEvents.stream()
                                .collect(Collectors.groupingBy(e -> e.getMatch().getId()));

                Map<UUID, List<MatchEvent>> allMatchEventsCache = new HashMap<>();

                List<PlayerMatchStatsDTO> recentMatches = lineups.stream()
                                .map(lineup -> {
                                        Match match = lineup.getMatch();
                                        List<MatchEvent> matchPlayerEvents = playerEventsByMatch
                                                        .getOrDefault(match.getId(), new ArrayList<>());

                                        List<MatchEvent> allMatchEvents = allMatchEventsCache.computeIfAbsent(
                                                        match.getId(),
                                                        id -> matchEventRepository.findAllByMatchIdIncludingDeleted(id));

                                        int mPoints = matchPlayerEvents.stream()
                                                        .mapToInt(this::getPointsForEvent).sum();
                                        int mTries = (int) matchPlayerEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.TRY).count();
                                        int mYellow = (int) matchPlayerEvents.stream()
                                                        .filter(e -> e.getEventType() == MatchEventType.YELLOW_CARD)
                                                        .count();
                                        int mRed = (int) matchPlayerEvents.stream()
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

                                        int duration = 80;
                                        if (match.getTournament() != null) {
                                                UUID catId = (match.getStage() != null
                                                                && match.getStage().getCategory() != null)
                                                                                ? match.getStage().getCategory().getId()
                                                                                : (match.getCategory() != null
                                                                                                ? match.getCategory()
                                                                                                                .getId()
                                                                                                : null);
                                                com.athleticaos.backend.entities.TournamentFormatConfig config = match
                                                                .getTournament().getFormatConfig(catId);
                                                if (config != null) {
                                                        duration = config.getMatchDurationMinutes();
                                                }
                                        }

                                        boolean wasSubbedIn = allMatchEvents.stream()
                                                        .anyMatch(e -> e.getEventType() == MatchEventType.SUBSTITUTION
                                                                        && e.getRelatedPlayer() != null
                                                                        && e.getRelatedPlayer().getId()
                                                                                        .equals(playerId));

                                        boolean wasOriginallyStarter;
                                        if (wasSubbedIn) {
                                                wasOriginallyStarter = false;
                                        } else {
                                                boolean wasSubbedOut = allMatchEvents.stream()
                                                                .anyMatch(e -> e.getEventType() == MatchEventType.SUBSTITUTION
                                                                                && e.getPlayer() != null
                                                                                && e.getPlayer().getId()
                                                                                                .equals(playerId));
                                                if (wasSubbedOut) {
                                                        wasOriginallyStarter = true;
                                                } else {
                                                        wasOriginallyStarter = lineup
                                                                        .getRole() == com.athleticaos.backend.enums.LineupRole.STARTER
                                                                        || lineup.isStarter();
                                                }
                                        }

                                        com.athleticaos.backend.enums.LineupRole effectiveRole = wasOriginallyStarter
                                                        ? com.athleticaos.backend.enums.LineupRole.STARTER
                                                        : com.athleticaos.backend.enums.LineupRole.BENCH;

                                        int minutesPlayedVal = calculateMinutesPlayed(match, playerId,
                                                        effectiveRole, allMatchEvents, duration);
                                        String minutesStr = String.valueOf(minutesPlayedVal);
                                        if (!wasOriginallyStarter && minutesPlayedVal > 0) {
                                                minutesStr += " (Sub)";
                                        } else if (minutesPlayedVal == 0
                                                        && effectiveRole == com.athleticaos.backend.enums.LineupRole.BENCH) {
                                                minutesStr = "DNP";
                                        }

                                        String teamName = lineup.getTeam() != null
                                                        ? lineup.getTeam().getName()
                                                        : null;
                                        String tournamentName = match.getTournament() != null
                                                        ? match.getTournament().getName()
                                                        : null;
                                        UUID tId = match.getTournament() != null
                                                        ? match.getTournament().getId()
                                                        : null;
                                        String tStatus = match.getTournament() != null && match.getTournament().getStatus() != null
                                                        ? match.getTournament().getStatus().name()
                                                        : null;

                                        return new PlayerMatchStatsDTO(
                                                        match.getId(),
                                                        match.getMatchDate(),
                                                        opponentName,
                                                        result,
                                                        mTries,
                                                        mPoints,
                                                        mYellow,
                                                        mRed,
                                                        minutesStr,
                                                        teamName,
                                                        tournamentName,
                                                        tId,
                                                        tStatus);
                                })
                                .sorted((m1, m2) -> {
                                        if (m1.matchDate() == null || m2.matchDate() == null)
                                                return 0;
                                        return m2.matchDate().compareTo(m1.matchDate());
                                })
                                .collect(Collectors.toList());

                int matchesPlayed = (int) recentMatches.stream()
                                .filter(m -> !m.minutesPlayed().equals("DNP"))
                                .count();

                int totalMinutesPlayed = recentMatches.stream()
                                .mapToInt(m -> {
                                        try {
                                                String minStr = m.minutesPlayed().split(" ")[0];
                                                if (minStr.equals("DNP"))
                                                        return 0;
                                                return Integer.parseInt(minStr);
                                        } catch (NumberFormatException e) {
                                                return 0;
                                        }
                                })
                                .sum();

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
                                totalMinutesPlayed,
                                recentMatches);
        }

        /**
         * Calculates the actual minutes a player was on the field during a match.
         * 
         * This method processes ALL match events (not just player-specific ones) to
         * correctly track when a player enters and leaves the field via substitutions
         * or red cards.
         * 
         * For substitution events:
         * - player (primary) = the player going OFF the field
         * - relatedPlayer = the player coming ON the field
         * 
         * @param match         The match
         * @param playerId      The player's ID
         * @param originalRole  The player's original role (STARTER or BENCH) before any
         *                      substitutions
         * @param allMatchEvents ALL events for the match (not just this player's)
         * @param matchDuration  Total match duration in minutes
         * @return Minutes played on the field
         */
        private int calculateMinutesPlayed(Match match, UUID playerId,
                        com.athleticaos.backend.enums.LineupRole originalRole,
                        List<MatchEvent> allMatchEvents, int matchDuration) {
                boolean isOn = originalRole == com.athleticaos.backend.enums.LineupRole.STARTER;
                int lastTime = 0;
                int totalMinutes = 0;

                // Sort events by minute (create copy to avoid mutating original list)
                List<MatchEvent> sortedEvents = new ArrayList<>(allMatchEvents);
                sortedEvents.sort(Comparator.comparingInt(e -> e.getMinute() != null ? e.getMinute() : 0));

                for (MatchEvent event : sortedEvents) {
                        if (event.getMinute() == null)
                                continue;
                        int eventTime = event.getMinute();

                        if (isOn) {
                                // Check if player is coming OFF (primary player in substitution)
                                if (event.getEventType() == MatchEventType.SUBSTITUTION && event.getPlayer() != null
                                                && event.getPlayer().getId().equals(playerId)) {
                                        totalMinutes += (eventTime - lastTime);
                                        isOn = false;
                                        lastTime = eventTime;
                                } else if (event.getEventType() == MatchEventType.RED_CARD
                                                && event.getPlayer() != null
                                                && event.getPlayer().getId().equals(playerId)) {
                                        totalMinutes += (eventTime - lastTime);
                                        isOn = false;
                                        lastTime = eventTime;
                                }
                        } else {
                                // Check if player is coming ON (relatedPlayer in substitution)
                                if (event.getEventType() == MatchEventType.SUBSTITUTION
                                                && event.getRelatedPlayer() != null
                                                && event.getRelatedPlayer().getId().equals(playerId)) {
                                        isOn = true;
                                        lastTime = eventTime;
                                }
                        }
                }

                // If still on at end of match
                if (isOn) {
                        totalMinutes += (matchDuration - lastTime);
                        if (totalMinutes > matchDuration)
                                totalMinutes = matchDuration; // Clamp
                }

                return totalMinutes;
        }

        @Override
        public TeamStatsResponse getTeamStats(UUID teamId, UUID tournamentId) {
                java.util.Objects.requireNonNull(teamId, "Team ID must not be null");
                Team team = teamRepository.findById(teamId)
                                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Team not found"));

                List<Match> matches = tournamentId == null
                                ? matchRepository.findByHomeTeamIdOrAwayTeamId(teamId, teamId)
                                : matchRepository.findByTeamIdAndTournamentId(teamId, tournamentId);

                int matchesPlayed = 0;
                int wins = 0;
                int draws = 0;
                int losses = 0;
                int pointsFor = 0;
                int pointsAgainst = 0;

                for (Match m : matches) {
                        if (m.getStatus() == MatchStatus.COMPLETED && m.getHomeScore() != null
                                        && m.getAwayScore() != null) {
                                matchesPlayed++;
                                boolean isHome = m.getHomeTeam() != null && m.getHomeTeam().getId().equals(teamId);
                                int scoreFor = isHome ? m.getHomeScore() : m.getAwayScore();
                                int scoreAgainst = isHome ? m.getAwayScore() : m.getHomeScore();

                                pointsFor += scoreFor;
                                pointsAgainst += scoreAgainst;

                                if (scoreFor > scoreAgainst) {
                                        wins++;
                                } else if (scoreFor == scoreAgainst) {
                                        draws++;
                                } else {
                                        losses++;
                                }
                        }
                }

                int pointsDifference = pointsFor - pointsAgainst;

                // Fetch event counts for this team
                List<Object[]> eventCounts = tournamentId == null
                                ? matchEventRepository.countEventsByTeamIdGroupByEventType(teamId)
                                : matchEventRepository.countEventsByTeamIdAndTournamentIdGroupByEventType(teamId, tournamentId);

                int tries = 0;
                int conversions = 0;
                int penalties = 0;
                int dropGoals = 0;
                int yellowCards = 0;
                int redCards = 0;

                for (Object[] row : eventCounts) {
                        if (row[0] != null && row[1] != null) {
                                MatchEventType type = (MatchEventType) row[0];
                                int count = ((Long) row[1]).intValue();
                                switch (type) {
                                        case TRY -> tries = count;
                                        case CONVERSION -> conversions = count;
                                        case PENALTY -> penalties = count;
                                        case DROP_GOAL -> dropGoals = count;
                                        case YELLOW_CARD -> yellowCards = count;
                                        case RED_CARD -> redCards = count;
                                        case SUBSTITUTION, PENALTY_TRY, INJURY, SCRUM, LINEOUT, OTHER -> {}
                                }
                        }
                }

                int tablePoints = wins * 4 + draws * 2;

                return new TeamStatsResponse(
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
                                tries,
                                conversions,
                                penalties,
                                dropGoals,
                                yellowCards,
                                redCards,
                                tablePoints
                );
        }

        @Override
        public com.athleticaos.backend.dtos.public_api.PublicTeamStatsResponse calculateTeamMatchStats(
                        List<MatchEvent> events, String teamName) {
                int tries = 0;
                int conversions = 0;
                int penalties = 0;
                int yellowCards = 0;
                int redCards = 0;

                for (MatchEvent event : events) {
                        // Null safety for team
                        if (teamName != null && event.getTeam() != null && teamName.equals(event.getTeam().getName())) {
                                switch (event.getEventType()) {
                                        case TRY:
                                                tries++;
                                                break;
                                        case CONVERSION:
                                                conversions++;
                                                break;
                                        case PENALTY:
                                                penalties++;
                                                break;
                                        case YELLOW_CARD:
                                                yellowCards++;
                                                break;
                                        case RED_CARD:
                                                redCards++;
                                                break;
                                        default:
                                                break;
                                }
                        }
                }

                return com.athleticaos.backend.dtos.public_api.PublicTeamStatsResponse.builder()
                                .tries(tries)
                                .conversions(conversions)
                                .penalties(penalties)
                                .yellowCards(yellowCards)
                                .redCards(redCards)
                                .build();
        }

        private int countEvents(List<MatchEvent> events, MatchEventType type) {
                return (int) events.stream().filter(e -> e.getEventType() == type).count();
        }

        @Override
        public int getPointsForEventType(MatchEventType eventType) { // Changed signature to match Interface (public)
                if (eventType == null)
                        return 0;
                if (eventType == MatchEventType.TRY) return 5;
                if (eventType == MatchEventType.CONVERSION) return 2;
                if (eventType == MatchEventType.PENALTY) return 3;
                if (eventType == MatchEventType.DROP_GOAL) return 3;
                return 0;
        }

        private int getPointsForEvent(MatchEvent event) {
                return getPointsForEventType(event.getEventType());
        }
}
