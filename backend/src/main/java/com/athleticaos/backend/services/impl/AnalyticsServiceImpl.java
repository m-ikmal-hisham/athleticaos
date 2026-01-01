package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.analytics.DisciplineCorrelation;
import com.athleticaos.backend.dtos.analytics.SeasonSummary;
import com.athleticaos.backend.dtos.analytics.TeamPerformanceTrend;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.MatchEvent;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.services.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TeamPerformanceTrend> getTeamPerformanceTrends(UUID teamId) {
        // Fetch matches where team is home or away
        List<Match> matches = matchRepository.findByHomeTeamIdOrAwayTeamId(teamId, teamId);

        return matches.stream()
                .filter(m -> m.getStatus() == MatchStatus.COMPLETED && m.getMatchDate() != null)
                .sorted(Comparator.comparing(Match::getMatchDate))
                .map(m -> {
                    boolean isHome = m.getHomeTeam().getId().equals(teamId);
                    int pointsScored = isHome ? m.getHomeScore() : m.getAwayScore();
                    int pointsConceded = isHome ? m.getAwayScore() : m.getHomeScore();
                    String opponent = isHome ? m.getAwayTeam().getName() : m.getHomeTeam().getName();

                    String result;
                    if (pointsScored > pointsConceded)
                        result = "WIN";
                    else if (pointsScored < pointsConceded)
                        result = "LOSS";
                    else
                        result = "DRAW";

                    return TeamPerformanceTrend.builder()
                            .matchDate(m.getMatchDate())
                            .opponentName(opponent)
                            .pointsScored(pointsScored)
                            .pointsConceded(pointsConceded)
                            .result(result)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisciplineCorrelation> getDisciplineImpact(UUID tournamentId) {
        // 1. Calculate League Points per Team
        List<Match> matches = matchRepository.findByTournamentId(tournamentId);
        Map<UUID, Integer> leaguePointsMap = new HashMap<>();
        Map<UUID, Integer> matchesPlayedMap = new HashMap<>();
        Map<UUID, String> teamNames = new HashMap<>();

        for (Match m : matches) {
            if (m.getStatus() != MatchStatus.COMPLETED)
                continue;

            UUID homeId = m.getHomeTeam().getId();
            UUID awayId = m.getAwayTeam().getId();
            teamNames.putIfAbsent(homeId, m.getHomeTeam().getName());
            teamNames.putIfAbsent(awayId, m.getAwayTeam().getName());

            matchesPlayedMap.merge(homeId, 1, (a, b) -> a + b);
            matchesPlayedMap.merge(awayId, 1, (a, b) -> a + b);

            // Simple standard points: Win=4, Draw=2, Loss=0
            if (m.getHomeScore() > m.getAwayScore()) {
                leaguePointsMap.merge(homeId, 4, (a, b) -> a + b);
                leaguePointsMap.merge(awayId, 0, (a, b) -> a + b); // Init if not exists
            } else if (m.getAwayScore() > m.getHomeScore()) {
                leaguePointsMap.merge(awayId, 4, (a, b) -> a + b);
                leaguePointsMap.merge(homeId, 0, (a, b) -> a + b);
            } else {
                leaguePointsMap.merge(homeId, 2, (a, b) -> a + b);
                leaguePointsMap.merge(awayId, 2, (a, b) -> a + b);
            }
        }

        // 2. Count Cards per Team
        List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);
        Map<UUID, Integer> redCardsMap = new HashMap<>();
        Map<UUID, Integer> yellowCardsMap = new HashMap<>();

        for (MatchEvent e : events) {
            if (e.getTeam() == null)
                continue;
            if (e.getEventType() == MatchEventType.RED_CARD) {
                redCardsMap.merge(e.getTeam().getId(), 1, (a, b) -> a + b);
            } else if (e.getEventType() == MatchEventType.YELLOW_CARD) {
                yellowCardsMap.merge(e.getTeam().getId(), 1, (a, b) -> a + b);
            }
        }

        // 3. Merge into DTOs
        List<DisciplineCorrelation> correlations = new ArrayList<>();
        for (UUID teamId : teamNames.keySet()) {
            correlations.add(DisciplineCorrelation.builder()
                    .teamId(teamId.toString())
                    .teamName(teamNames.get(teamId))
                    .leaguePoints(leaguePointsMap.getOrDefault(teamId, 0))
                    .matchesPlayed(matchesPlayedMap.getOrDefault(teamId, 0))
                    .totalRedCards(redCardsMap.getOrDefault(teamId, 0))
                    .totalYellowCards(yellowCardsMap.getOrDefault(teamId, 0))
                    .build());
        }

        return correlations;
    }

    @Override
    @Transactional(readOnly = true)
    public SeasonSummary getSeasonSummary(UUID tournamentId) {
        List<Match> matches = matchRepository.findByTournamentId(tournamentId);

        int totalMatches = matches.size();
        int completedMatches = 0;
        int totalPoints = 0;
        Set<UUID> activeTeams = new HashSet<>();
        Map<String, Integer> teamTotalScore = new HashMap<>();

        for (Match m : matches) {
            activeTeams.add(m.getHomeTeam().getId());
            activeTeams.add(m.getAwayTeam().getId());

            if (m.getStatus() == MatchStatus.COMPLETED) {
                completedMatches++;
                totalPoints += m.getHomeScore() + m.getAwayScore();

                teamTotalScore.merge(m.getHomeTeam().getName(), m.getHomeScore(), (a, b) -> a + b);
                teamTotalScore.merge(m.getAwayTeam().getName(), m.getAwayScore(), (a, b) -> a + b);
            }
        }

        String highestScoringTeam = teamTotalScore.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Count Tries
        List<MatchEvent> events = matchEventRepository.findByMatch_Tournament_Id(tournamentId);
        int totalTries = (int) events.stream()
                .filter(e -> e.getEventType() == MatchEventType.TRY)
                .count();

        double avgPoints = completedMatches > 0 ? (double) totalPoints / completedMatches : 0.0;

        return SeasonSummary.builder()
                .totalMatches(totalMatches)
                .completedMatches(completedMatches)
                .totalTries(totalTries)
                .avgPointsPerMatch(Math.round(avgPoints * 100.0) / 100.0)
                .activeTeams(activeTeams.size())
                .highestScoringTeam(highestScoringTeam)
                .build();
    }
}
