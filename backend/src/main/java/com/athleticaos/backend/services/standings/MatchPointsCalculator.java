package com.athleticaos.backend.services.standings;

import com.athleticaos.backend.enums.MatchResultType;

import java.util.Objects;
import java.util.UUID;

public class MatchPointsCalculator {

    private MatchPointsCalculator() {
        // Utility class
    }

    public static MatchPointsResult calculate(
            ScoringRules rules,
            Integer homeScore,
            Integer awayScore,
            MatchResultType resultType,
            UUID winnerTeamId,
            UUID homeTeamId,
            UUID awayTeamId,
            int homeTries,
            int awayTries,
            boolean triesKnown
    ) {
        ScoringRules activeRules = rules != null ? rules : ScoringRules.defaults();

        // 1. Handle unplayed explicit results: Walkover & Bye
        if (resultType == MatchResultType.WALKOVER) {
            boolean homeWon = isHomeWinner(winnerTeamId, homeTeamId, awayTeamId, homeScore, awayScore);
            int homeBase = homeWon ? activeRules.pointsWin() : activeRules.pointsLoss();
            int awayBase = homeWon ? activeRules.pointsLoss() : activeRules.pointsWin();
            // Walkover awards no bonus points to either team
            return new MatchPointsResult(
                    new TeamMatchPoints(homeBase, homeBase, 0, 0, 0, triesKnown),
                    new TeamMatchPoints(awayBase, awayBase, 0, 0, 0, triesKnown)
            );
        }

        if (resultType == MatchResultType.BYE) {
            boolean homeWon = (homeTeamId != null && (Objects.equals(homeTeamId, winnerTeamId) || awayTeamId == null));
            int homeBase = homeWon ? activeRules.pointsWin() : 0;
            int awayBase = homeWon ? 0 : (awayTeamId != null ? activeRules.pointsWin() : 0);
            return new MatchPointsResult(
                    new TeamMatchPoints(homeBase, homeBase, 0, 0, 0, triesKnown),
                    new TeamMatchPoints(awayBase, awayBase, 0, 0, 0, triesKnown)
            );
        }

        // 2. Normal match requires scores
        if (homeScore == null || awayScore == null) {
            return new MatchPointsResult(
                    TeamMatchPoints.zero(triesKnown),
                    TeamMatchPoints.zero(triesKnown)
            );
        }

        int hScore = homeScore;
        int aScore = awayScore;

        int homeBase;
        int awayBase;
        int homeLossBonus = 0;
        int awayLossBonus = 0;

        if (hScore > aScore) {
            homeBase = activeRules.pointsWin();
            awayBase = activeRules.pointsLoss();
            if (activeRules.bonusPointsEnabled() && (hScore - aScore <= activeRules.bonusLosingMargin())) {
                awayLossBonus = activeRules.pointsBonusLoss();
            }
        } else if (aScore > hScore) {
            awayBase = activeRules.pointsWin();
            homeBase = activeRules.pointsLoss();
            if (activeRules.bonusPointsEnabled() && (aScore - hScore <= activeRules.bonusLosingMargin())) {
                homeLossBonus = activeRules.pointsBonusLoss();
            }
        } else {
            homeBase = activeRules.pointsDraw();
            awayBase = activeRules.pointsDraw();
        }

        // Try bonus points (only if bonus points are enabled and tries are known)
        int homeTryBonus = 0;
        int awayTryBonus = 0;
        if (activeRules.bonusPointsEnabled() && triesKnown) {
            if (homeTries >= activeRules.bonusTryThreshold()) {
                homeTryBonus = activeRules.pointsBonusTry();
            }
            if (awayTries >= activeRules.bonusTryThreshold()) {
                awayTryBonus = activeRules.pointsBonusTry();
            }
        }

        int homeBonusTotal = homeTryBonus + homeLossBonus;
        int awayBonusTotal = awayTryBonus + awayLossBonus;

        int homeTablePoints = homeBase + homeBonusTotal;
        int awayTablePoints = awayBase + awayBonusTotal;

        return new MatchPointsResult(
                new TeamMatchPoints(homeTablePoints, homeBase, homeBonusTotal, homeTryBonus, homeLossBonus, triesKnown),
                new TeamMatchPoints(awayTablePoints, awayBase, awayBonusTotal, awayTryBonus, awayLossBonus, triesKnown)
        );
    }

    private static boolean isHomeWinner(UUID winnerTeamId, UUID homeTeamId, UUID awayTeamId,
                                        Integer homeScore, Integer awayScore) {
        if (winnerTeamId != null && homeTeamId != null && winnerTeamId.equals(homeTeamId)) {
            return true;
        }
        if (winnerTeamId != null && awayTeamId != null && winnerTeamId.equals(awayTeamId)) {
            return false;
        }
        if (homeScore != null && awayScore != null) {
            return homeScore >= awayScore;
        }
        return true;
    }
}
