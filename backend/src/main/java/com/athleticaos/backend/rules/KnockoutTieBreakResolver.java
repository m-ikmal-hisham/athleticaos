package com.athleticaos.backend.rules;

import com.athleticaos.backend.entities.TournamentFormatConfig;

public final class KnockoutTieBreakResolver {

    public static final String DEFAULT_TIE_BREAKER = "EXTRA_TIME";
    public static final int DEFAULT_MINUTES_FIFTEENS = 15;
    public static final int DEFAULT_MINUTES_SHORT = 5;

    private KnockoutTieBreakResolver() {
    }

    public static boolean isFifteens(String rugbyFormat) {
        if (rugbyFormat == null) {
            return false;
        }
        String s = rugbyFormat.trim().toUpperCase();
        return s.equals("XV") || s.equals("RUGBY_XV") || s.equals("FIFTEENS") || s.contains("15");
    }

    public static String resolveTieBreaker(TournamentFormatConfig categoryConfig, TournamentFormatConfig tournamentConfig) {
        if (categoryConfig != null && categoryConfig.getKnockoutTieBreaker() != null
                && !categoryConfig.getKnockoutTieBreaker().isBlank()) {
            return categoryConfig.getKnockoutTieBreaker();
        }
        if (tournamentConfig != null && tournamentConfig.getKnockoutTieBreaker() != null
                && !tournamentConfig.getKnockoutTieBreaker().isBlank()) {
            return tournamentConfig.getKnockoutTieBreaker();
        }
        return DEFAULT_TIE_BREAKER;
    }

    public static int resolveExtraTimeMinutes(TournamentFormatConfig categoryConfig, TournamentFormatConfig tournamentConfig,
            String rugbyFormat) {
        if (categoryConfig != null && categoryConfig.getExtraTimeMinutes() != null) {
            return categoryConfig.getExtraTimeMinutes();
        }
        if (tournamentConfig != null && tournamentConfig.getExtraTimeMinutes() != null) {
            return tournamentConfig.getExtraTimeMinutes();
        }
        String format = rugbyFormat;
        if (format == null && categoryConfig != null) {
            format = categoryConfig.getRugbyFormat();
        }
        if (format == null && tournamentConfig != null) {
            format = tournamentConfig.getRugbyFormat();
        }
        return isFifteens(format) ? DEFAULT_MINUTES_FIFTEENS : DEFAULT_MINUTES_SHORT;
    }
}

