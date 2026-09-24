package com.athleticaos.backend.utils;

import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.enums.TournamentStageType;

import java.util.Locale;

/**
 * Helpers for building match codes.
 */
public final class MatchCodeUtils {

    /** Longest run of initials kept from a category name, before any age digits are appended. */
    private static final int MAX_INITIALS = 6;

    private MatchCodeUtils() {
        // Prevent instantiation
    }

    /**
     * Abbreviates a category name for use in a match code.
     *
     * <p>Takes the first letter of each word and keeps every digit, so the age group survives:
     * "Boys U16" becomes "BU16" and "Girls U16" becomes "GU16". Both spellings of the same
     * category converge, so "Boys Under 16" also becomes "BU16".
     *
     * <p>Keeping the digits matters. An earlier version took only the first letter of each word,
     * which collapsed "Boys U11", "Boys U14" and "Boys U16" to the single abbreviation "BU". Every
     * age group then generated identical knockout codes — one tournament held three different Cup
     * quarter-finals all coded "...-BU-CUPQF-M1" — which made distinct fixtures look like
     * duplicates and blocked any uniqueness constraint on the match code.
     *
     * <p>Initials are capped at {@value #MAX_INITIALS}; digits are appended afterwards and are
     * never truncated, because truncating them would reintroduce the collision.
     *
     * @param category the category, may be null
     * @return the abbreviation, or "" when there is no usable category name
     */
    public static String categoryAbbr(TournamentCategory category) {
        if (category == null || category.getName() == null || category.getName().isBlank()) {
            return "";
        }
        StringBuilder initials = new StringBuilder();
        StringBuilder digits = new StringBuilder();
        for (String word : category.getName().split("[\\s\\-_]+")) {
            String cleaned = word.replaceAll("[^a-zA-Z0-9]", "");
            if (cleaned.isEmpty()) {
                continue;
            }
            if (!Character.isDigit(cleaned.charAt(0))) {
                initials.append(Character.toUpperCase(cleaned.charAt(0)));
            }
            digits.append(cleaned.replaceAll("\\D", ""));
        }
        String abbr = initials.length() > MAX_INITIALS
                ? initials.substring(0, MAX_INITIALS)
                : initials.toString();
        return abbr + digits;
    }

    /**
     * The bracket part of a knockout match code: the placement rung ("PLT", "WSP", ...) or "CUP".
     *
     * <p>Must match {@code BracketServiceImpl.PLACEMENT_LADDER}, which a test pins. Every rung gets
     * its own abbreviation. Taking the first two letters of the stage type, as two generators used
     * to, made WOODEN_SPOON and WOODEN_FORK both "WO" and gave their semi-finals and finals
     * identical codes.
     *
     * @param type the stage type, may be null
     * @return the rung abbreviation, or "CUP" for the Cup rounds and anything unrecognised
     */
    public static String bracketAbbr(TournamentStageType type) {
        if (type == null) {
            return "CUP";
        }
        return switch (type) {
            case PLATE -> "PLT";
            case BOWL -> "BWL";
            case SHIELD -> "SHD";
            case SPOON -> "SPN";
            case FORK -> "FRK";
            case SAUCER -> "SAU";
            case CHOPSTICK -> "CHP";
            case WOODEN_SPOON -> "WSP";
            case WOODEN_FORK -> "WFK";
            case CLASSIFICATION -> "CLS";
            default -> "CUP";
        };
    }

    /**
     * The round part of a knockout match code: "R16", "QF", "SF", "F" or "PO".
     *
     * <p>Cup rounds carry the round in their stage type. Placement rungs tag every round with the
     * rung's type, so for those the round is read from the stage name ("Plate Semi Finals",
     * "7th Place Playoff").
     *
     * @return the round abbreviation, or "" when it cannot be determined
     */
    public static String roundAbbr(TournamentStageType type, String stageName) {
        if (type != null) {
            switch (type) {
                case ROUND_OF_16: return "R16";
                case QUARTER_FINAL: return "QF";
                case SEMI_FINAL: return "SF";
                case FINAL: return "F";
                case THIRD_PLACE: return "PO";
                default: break;
            }
        }
        String name = stageName == null ? "" : stageName.toLowerCase(Locale.ROOT);
        if (name.contains("playoff") || name.contains("play-off")) return "PO";
        if (name.contains("round of 16")) return "R16";
        if (name.contains("quarter")) return "QF";
        if (name.contains("semi")) return "SF";
        if (name.contains("final")) return "F";
        return "";
    }

    /**
     * Bracket plus round, e.g. "CUPQF", "PLTSF", "WSPF", "WFKPO": the same token the placement
     * ladder writes, so a match created later by progression reads like one generated up front.
     */
    public static String stageToken(TournamentStageType type, String stageName) {
        return bracketAbbr(type) + roundAbbr(type, stageName);
    }
}
