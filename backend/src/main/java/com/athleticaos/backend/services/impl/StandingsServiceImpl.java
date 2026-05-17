package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.util.UrlSanitizer;

import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentFormatConfig;
import com.athleticaos.backend.entities.TournamentTeam;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.TournamentFormatConfigRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.StandingsService;
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

    @Override
    @Transactional(readOnly = true)
    public List<StandingsResponse> getStandings(UUID tournamentId) {
        log.info("Calculating standings for tournament {}", tournamentId);

        // Load scoring rules from tournament format config (global = category is null)
        int pointsWin = 4;   // defaults
        int pointsDraw = 2;
        int pointsLoss = 0;

        TournamentFormatConfig formatConfig = formatConfigRepository
                .findByTournamentIdAndCategoryIsNull(tournamentId)
                .orElse(null);
        if (formatConfig != null) {
            pointsWin = formatConfig.getPointsWin() != null ? formatConfig.getPointsWin() : 4;
            pointsDraw = formatConfig.getPointsDraw() != null ? formatConfig.getPointsDraw() : 2;
            pointsLoss = formatConfig.getPointsLoss() != null ? formatConfig.getPointsLoss() : 0;
            log.info("Using configured scoring rules: Win={}, Draw={}, Loss={}", pointsWin, pointsDraw, pointsLoss);
        } else {
            log.info("No format config found, using default scoring rules: Win={}, Draw={}, Loss={}", pointsWin, pointsDraw, pointsLoss);
        }

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
                            .teamLogoUrl(UrlSanitizer.sanitize(tt.getTeam().getLogoUrl()))
                            .teamShortName(tt.getTeam().getShortName())
                            .poolName(tt.getPoolNumber())
                            .played(0)
                            .won(0)
                            .drawn(0)
                            .lost(0)
                            .pointsFor(0)
                            .pointsAgainst(0)
                            .pointsDiff(0)
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

        // 2. Get all matches (eager load stage)
        List<Match> matches = matchRepository.findByTournamentIdWithTeams(tournamentId);
        log.info("Found {} matches", matches.size());

        // 3. Process matches
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
                log.warn("Match {} teams not found in standings map. Home: {}, Away: {}", match.getId(),
                        homeStats != null, awayStats != null);
                continue;
            }

            int hScore = match.getHomeScore() != null ? match.getHomeScore() : 0;
            int aScore = match.getAwayScore() != null ? match.getAwayScore() : 0;

            // Update Home
            updateStats(homeStats, hScore, aScore, pointsWin, pointsDraw, pointsLoss);

            // Update Away
            updateStats(awayStats, aScore, hScore, pointsWin, pointsDraw, pointsLoss);
        }

        // 4. Return sorted list
        return standingsMap.values().stream()
                .sorted(Comparator.comparing(StandingsResponse::getPoolName) // Group by Pool
                        .thenComparing(StandingsResponse::getPoints, Comparator.reverseOrder()) // High Points
                        .thenComparing(StandingsResponse::getPointsDiff, Comparator.reverseOrder()) // High Diff
                        .thenComparing(StandingsResponse::getPointsFor, Comparator.reverseOrder()) // High Scored
                        .thenComparing(StandingsResponse::getTeamName)) // Alphabetical Fallback
                .collect(Collectors.toList());
    }

    private void updateStats(StandingsResponse stats, int scoreFor, int scoreAgainst,
                              int pointsWin, int pointsDraw, int pointsLoss) {
        stats.setPlayed(stats.getPlayed() + 1);
        stats.setPointsFor(stats.getPointsFor() + scoreFor);
        stats.setPointsAgainst(stats.getPointsAgainst() + scoreAgainst);
        stats.setPointsDiff(stats.getPointsFor() - stats.getPointsAgainst());

        if (scoreFor > scoreAgainst) {
            stats.setWon(stats.getWon() + 1);
            stats.setPoints(stats.getPoints() + pointsWin);
        } else if (scoreFor == scoreAgainst) {
            stats.setDrawn(stats.getDrawn() + 1);
            stats.setPoints(stats.getPoints() + pointsDraw);
        } else {
            stats.setLost(stats.getLost() + 1);
            stats.setPoints(stats.getPoints() + pointsLoss);
        }
    }
}
