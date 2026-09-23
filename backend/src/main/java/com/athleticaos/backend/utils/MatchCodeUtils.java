package com.athleticaos.backend.utils;

import com.athleticaos.backend.entities.TournamentCategory;

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
}
