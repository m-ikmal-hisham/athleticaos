package com.athleticaos.backend.utils;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.TournamentFormatConfig;

import java.util.UUID;

public final class LineupConfigHelper {

    private LineupConfigHelper() {}

    public record LineupLimits(int startersCount, int maxBenchCount) {}

    public static LineupLimits resolveLimits(Match match) {
        if (match == null || match.getTournament() == null) {
            return new LineupLimits(15, 10);
        }

        UUID categoryId = null;
        if (match.getStage() != null && match.getStage().getCategory() != null) {
            categoryId = match.getStage().getCategory().getId();
        } else if (match.getCategory() != null) {
            categoryId = match.getCategory().getId();
        }

        TournamentFormatConfig config = match.getTournament().getFormatConfig(categoryId);
        if (config != null) {
            int starters = config.getStartersCount() != null ? config.getStartersCount() : 15;
            int bench = config.getMaxBenchCount() != null ? config.getMaxBenchCount() : 10;
            return new LineupLimits(starters, bench);
        }

        return new LineupLimits(15, 10);
    }
}
