package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentTeam;
import com.athleticaos.backend.enums.MatchResultType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentFormatConfigRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.StandingsService;
import com.athleticaos.backend.services.standings.MatchPointsCalculator;
import com.athleticaos.backend.services.standings.MatchPointsResult;
import com.athleticaos.backend.services.standings.ScoringRules;
import com.athleticaos.backend.services.standings.TeamMatchPoints;
import com.athleticaos.backend.util.UrlSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StandingsServiceImpl implements StandingsService {

    private final MatchRepository matchRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final TournamentFormatConfigRepository formatConfigRepository;
    private final MatchEventRepository matchEventRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StandingsResponse> getStandings(UUID tournamentId) {
        log.info("Calculating standings for tournament {}", tournamentId);

        // Load scoring rules from tournament format config (global = category is null)
        ScoringRules globalRules = formatConfigRepository
                .findByTournamentIdAndCategoryIsNull(tournamentId)
                .map(ScoringRules::from)
                .orElseGet(ScoringRules::defaults);

        log.info("Using global scoring rules: Win={}, Draw={}, Loss={}, BonusEnabled={}",
                globalRules.pointsWin(), globalRules.pointsDraw(), globalRules.pointsLoss(),
                globalRules.bonusPointsEnabled());

        // 1. Get all teams in the tournament
        List<TournamentTeam> teams = tournamentTeamRepository.findByTournamentId(tournamentId);
        log.info("Found {} teams in tournament", teams.size());

        // Map to store standings, keyed by Team ID
        Map<UUID, StandingsResponse> standingsMap = new HashMap<>();

        // Initialize standings for teams assigned to a pool
        for (TournamentTeam tt : teams) {
            if (tt.getPoolNumber() != null && !tt.getPoolNumber().isEmpty() && tt.isActive()) {
                if (tt.getTeam() != null) {
                    standingsMap.put(tt.getTeam().getId(), StandingsResponse.builder()
                            .teamId(tt.getTeam().getId())
                            .teamName(tt.getTeam().getName())
                            .teamLogoUrl(UrlSanitizer.sanitize(
                                    tt.getTeam().getLogoUrl() != null && !tt.getTeam().getLogoUrl().isBlank()
                                            ? tt.getTeam().getLogoUrl()
                                            : (tt.getTeam().getOrganisation() != null ? tt.getTeam().getOrganisation().getLogoUrl() : null)))
                            .teamShortName(tt.getTeam().getShortName())
                            .poolName(tt.getPoolNumber())
                            .played(0)
                            .won(0)
                            .drawn(0)
                            .lost(0)
                            .pointsFor(0)
                            .pointsAgainst(0)
                            .pointsDiff(0)
                            .bonusPoints(0)
                            .triesFor(0)
                            .points(0)
                            .categoryId(tt.getCategory() != null ? tt.getCategory().getId() : null)
                            .build());
                } else {
                    log.warn("TournamentTeam {} has null Team reference", tt.getId());
                }
            } else {
                if (tt.getPoolNumber() == null) {
                    log.debug("Team {} has no pool number", tt.getId());
                }
            }
        }

        log.info("Initialized standings map with {} teams", standingsMap.size());
        Map<UUID, ScoringRules> rulesByCategory = new HashMap<>();

        // 2. Load try counts and scoring events in one query per tournament
        List<Object[]> scoringStats = matchEventRepository.findScoringEventCountsByTournamentId(tournamentId);
        Map<UUID, Long> matchScoringEventCounts = new HashMap<>();
        Map<UUID, Map<UUID, Integer>> matchTeamTryCounts = new HashMap<>();
        for (Object[] row : scoringStats) {
            UUID mId = (UUID) row[0];
            UUID tId = (UUID) row[1];
            int tries = row[2] != null ? ((Number) row[2]).intValue() : 0;
            long scoringEvents = row[3] != null ? ((Number) row[3]).longValue() : 0L;
            matchScoringEventCounts.merge(mId, scoringEvents, Long::sum);
            matchTeamTryCounts.computeIfAbsent(mId, k -> new HashMap<>()).put(tId, tries);
        }

        // Score-only matches per category (null = no category), so a category's note lists only its own matches
        Map<UUID, Set<String>> unrecordedBonusMatchCodes = new HashMap<>();

        // 3. Get all matches (eager load stage)
        List<Match> matches = matchRepository.findByTournamentIdWithTeams(tournamentId);
        log.info("Found {} matches", matches.size());

        // 4. Process matches
        for (Match match : matches) {
            // Only consider Group/Pool stage matches
            if (match.getStage() == null || !Boolean.TRUE.equals(match.getStage().getIsGroupStage())) {
                continue;
            }

            // Consider Completed and Ongoing matches for points
            if (match.getStatus() != MatchStatus.COMPLETED && match.getStatus() != MatchStatus.ONGOING) {
                continue;
            }

            if (match.getHomeTeam() == null || match.getAwayTeam() == null) {
                log.warn("Match {} (Completed) has missing teams", match.getId());
                continue;
            }

            UUID homeId = match.getHomeTeam().getId();
            UUID awayId = match.getAwayTeam().getId();

            StandingsResponse homeStats = standingsMap.get(homeId);
            StandingsResponse awayStats = standingsMap.get(awayId);

            // Skip if teams not found in map (maybe not in pool or inactive?)
            if (homeStats == null || awayStats == null) {
                log.warn("Match {} teams not found in standings mapping. Home: {}, Away: {}", match.getId(),
                        homeStats != null, awayStats != null);
                continue;
            }

            int hScore = match.getHomeScore() != null ? match.getHomeScore() : 0;
            int aScore = match.getAwayScore() != null ? match.getAwayScore() : 0;

            // Score with the match's own category rules, falling back to the tournament-wide ones.
            ScoringRules rules = rulesByCategory.computeIfAbsent(categoryOf(match),
                    categoryId -> categoryRules(tournamentId, categoryId, globalRules));

            long totalScoringEvents = matchScoringEventCounts.getOrDefault(match.getId(), 0L);
            boolean isZeroZero = match.getHomeScore() != null && match.getHomeScore() == 0
                    && match.getAwayScore() != null && match.getAwayScore() == 0;
            boolean triesKnown = (totalScoringEvents > 0) || isZeroZero;

            if (rules.bonusPointsEnabled() && !triesKnown && match.getResultType() != MatchResultType.WALKOVER && match.getResultType() != MatchResultType.BYE) {
                String code = match.getMatchCode() != null && !match.getMatchCode().isBlank()
                        ? match.getMatchCode()
                        : (match.getMatchNumber() != null ? "M" + match.getMatchNumber() : match.getId().toString().substring(0, 8));
                unrecordedBonusMatchCodes.computeIfAbsent(categoryOf(match), k -> new LinkedHashSet<>()).add(code);
            }

            int homeTries = matchTeamTryCounts.getOrDefault(match.getId(), Collections.emptyMap()).getOrDefault(homeId, 0);
            int awayTries = matchTeamTryCounts.getOrDefault(match.getId(), Collections.emptyMap()).getOrDefault(awayId, 0);

            MatchPointsResult result = MatchPointsCalculator.calculate(
                    rules,
                    match.getHomeScore(),
                    match.getAwayScore(),
                    match.getResultType(),
                    match.getWinnerTeam() != null ? match.getWinnerTeam().getId() : null,
                    homeId,
                    awayId,
                    homeTries,
                    awayTries,
                    triesKnown
            );

            // Update Home
            updateStats(homeStats, hScore, aScore, homeTries, result.home());

            // Update Away
            updateStats(awayStats, aScore, hScore, awayTries, result.away());
        }

        for (StandingsResponse response : standingsMap.values()) {
            ScoringRules rules = rulesByCategory.computeIfAbsent(response.getCategoryId(),
                    categoryId -> categoryRules(tournamentId, categoryId, globalRules));
            response.setBonusPointsEnabled(rules.bonusPointsEnabled());
            response.setUnrecordedBonusMatchCodes(new ArrayList<>(
                    unrecordedBonusMatchCodes.getOrDefault(response.getCategoryId(), Collections.emptySet())));
        }

        // 5. Return sorted list
        return standingsMap.values().stream()
                .sorted(Comparator.comparing((StandingsResponse s) -> s.getPoolName()) // Group by Pool
                        .thenComparing(s -> s.getPoints(), Comparator.reverseOrder()) // High Points
                        .thenComparing(s -> s.getPointsDiff(), Comparator.reverseOrder()) // High Diff
                        .thenComparing(s -> s.getPointsFor(), Comparator.reverseOrder()) // High Scored
                        .thenComparing(s -> s.getTeamName())) // Alphabetical Fallback
                .collect(Collectors.toList());
    }

    private static UUID categoryOf(Match match) {
        if (match.getStage() != null && match.getStage().getCategory() != null) {
            return match.getStage().getCategory().getId();
        }
        return match.getCategory() != null ? match.getCategory().getId() : null;
    }

    /** Scoring rules for a category: its own config when it has one, otherwise the global rules. */
    private ScoringRules categoryRules(UUID tournamentId, UUID categoryId, ScoringRules globalRules) {
        if (categoryId == null) {
            return globalRules;
        }
        return formatConfigRepository.findByTournamentIdAndCategoryId(tournamentId, categoryId)
                .map(ScoringRules::from)
                .orElse(globalRules);
    }

    private void updateStats(StandingsResponse stats, int scoreFor, int scoreAgainst,
                            int tries, TeamMatchPoints matchPoints) {
        stats.setPlayed(stats.getPlayed() + 1);
        stats.setPointsFor(stats.getPointsFor() + scoreFor);
        stats.setPointsAgainst(stats.getPointsAgainst() + scoreAgainst);
        stats.setPointsDiff(stats.getPointsFor() - stats.getPointsAgainst());
        stats.setTriesFor(stats.getTriesFor() + tries);
        stats.setBonusPoints(stats.getBonusPoints() + matchPoints.bonusPoints());
        stats.setPoints(stats.getPoints() + matchPoints.tablePoints());

        if (scoreFor > scoreAgainst) {
            stats.setWon(stats.getWon() + 1);
        } else if (scoreFor == scoreAgainst) {
            stats.setDrawn(stats.getDrawn() + 1);
        } else {
            stats.setLost(stats.getLost() + 1);
        }
    }
}
