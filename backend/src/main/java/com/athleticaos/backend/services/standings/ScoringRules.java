package com.athleticaos.backend.services.standings;

import com.athleticaos.backend.entities.TournamentFormatConfig;

public record ScoringRules(
        int pointsWin,
        int pointsDraw,
        int pointsLoss,
        boolean bonusPointsEnabled,
        int pointsBonusTry,
        int bonusTryThreshold,
        int pointsBonusLoss,
        int bonusLosingMargin
) {
    public static ScoringRules from(TournamentFormatConfig config) {
        if (config == null) {
            return defaults();
        }
        return new ScoringRules(
                config.getPointsWin() != null ? config.getPointsWin() : 4,
                config.getPointsDraw() != null ? config.getPointsDraw() : 2,
                config.getPointsLoss() != null ? config.getPointsLoss() : 0,
                Boolean.TRUE.equals(config.getBonusPointsEnabled()),
                config.getPointsBonusTry() != null ? config.getPointsBonusTry() : 1,
                config.getBonusTryThreshold() != null ? config.getBonusTryThreshold() : 4,
                config.getPointsBonusLoss() != null ? config.getPointsBonusLoss() : 1,
                config.getBonusLosingMargin() != null ? config.getBonusLosingMargin() : 7
        );
    }

    public static ScoringRules defaults() {
        return new ScoringRules(4, 2, 0, false, 1, 4, 1, 7);
    }
}
