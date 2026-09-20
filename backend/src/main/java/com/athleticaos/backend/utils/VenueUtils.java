package com.athleticaos.backend.utils;

/**
 * Utility methods for tournament venue handling and normalisation.
 */
public final class VenueUtils {

    /** Leading outcome word of a feeder placeholder, e.g. the "Lose" in "Lose 77". */
    private static final java.util.regex.Pattern OUTCOME_PREFIX = java.util.regex.Pattern
            .compile("^(Lose|Loser|Win|Winner)\\b", java.util.regex.Pattern.CASE_INSENSITIVE);

    private VenueUtils() {
        // Prevent instantiation
    }

    /**
     * Normalises a venue string for grouping and database index matching.
     * Trims leading and trailing whitespace; treats null and blank strings as the same
     * single empty string "" ("unassigned" group).
     * Comparison is exact after trimming without folding case to match database index behaviour.
     *
     * @param venue the raw venue string
     * @return the trimmed venue string, or "" if null/blank
     */
    public static String normalizeVenue(String venue) {
        if (venue == null) {
            return "";
        }
        String trimmed = venue.trim();
        return trimmed.isEmpty() ? "" : trimmed;
    }

    /**
     * Formats a feeder placeholder string, showing the feeder's venue alongside its number
     * when the feeder match is at a different venue than the target match.
     * Example: "Lose 77 (Venue B)" when target is at Venue A and feeder is at Venue B.
     * If feeder is at the same venue: unchanged, e.g. "Lose 77".
     *
     * @param placeholder the raw placeholder text (e.g. "Lose 77", "Winner M1", "TBD")
     * @param targetVenue the venue of the match containing the placeholder
     * @param feeder the earlier match that feeds this slot
     * @return the formatted placeholder string
     */
    public static String formatFeederPlaceholder(String placeholder, String targetVenue, com.athleticaos.backend.entities.Match feeder) {
        return formatFeederPlaceholder(placeholder, targetVenue, feeder, "Winner");
    }

    public static String formatFeederPlaceholder(String placeholder, String targetVenue,
            com.athleticaos.backend.entities.Match feeder, String defaultOutcome) {
        if (feeder == null) {
            return placeholder;
        }

        // Keep the wording the stored placeholder used ("Lose" vs "Loser", "Win" vs "Winner").
        String prefix = defaultOutcome != null ? defaultOutcome : "Winner";
        if (placeholder != null && !placeholder.trim().isEmpty() && !"TBD".equalsIgnoreCase(placeholder.trim())) {
            java.util.regex.Matcher m = OUTCOME_PREFIX.matcher(placeholder.trim());
            if (m.find()) {
                prefix = m.group(1);
            }
        }

        // Always rebuild the label from the feeder's CURRENT number. Stored placeholders carry the
        // feeder's match code, which never changes; numbers are per venue and move whenever an
        // organiser renumbers the tournament, so a stored number would go stale.
        String identifier = feeder.getMatchNumber() != null
                ? String.valueOf(feeder.getMatchNumber())
                : (feeder.getMatchCode() != null ? feeder.getMatchCode() : "");
        String base = identifier.isEmpty() ? prefix : prefix + " " + identifier;

        // Cross-venue check. Venues compare exactly after trimming, the same way normalizeVenue and
        // the unique index do, so two venues differing only by case stay distinct here as well.
        String feederVenue = normalizeVenue(feeder.getVenue());
        boolean isCrossVenue = !feederVenue.isEmpty() && !feederVenue.equals(normalizeVenue(targetVenue));
        return isCrossVenue ? base + " (" + feederVenue + ")" : base;
    }

    /**
     * Resolves and formats a feeder placeholder from a collection of tournament matches.
     */
    public static String formatFeederPlaceholder(
            com.athleticaos.backend.entities.Match targetMatch,
            String placeholder,
            String slot,
            java.util.Map<java.util.UUID, com.athleticaos.backend.entities.Match> matchesById,
            java.util.Map<Integer, com.athleticaos.backend.entities.Match> matchesByNumber,
            java.util.Map<String, com.athleticaos.backend.entities.Match> matchesByCode) {

        if (targetMatch == null) {
            return placeholder;
        }

        com.athleticaos.backend.entities.Match feeder = null;
        String linkOutcome = "Winner";
        java.util.UUID targetId = targetMatch.getId();

        // 1. Check if any match explicitly links to targetMatch's slot
        if (matchesById != null && targetId != null && slot != null) {
            for (com.athleticaos.backend.entities.Match m : matchesById.values()) {
                if (targetId.equals(m.getNextMatchIdForWinner()) && slot.equalsIgnoreCase(m.getWinnerSlot())) {
                    feeder = m;
                    linkOutcome = "Winner";
                    break;
                }
                if (targetId.equals(m.getNextMatchIdForLoser()) && slot.equalsIgnoreCase(m.getLoserSlot())) {
                    feeder = m;
                    linkOutcome = "Lose";
                    break;
                }
            }
        }

        // 2. If not found, inspect placeholder pattern for (Lose|Loser|Win|Winner) <number|code>
        if (feeder == null && placeholder != null && !placeholder.trim().isEmpty()) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("^(Lose|Loser|Win|Winner)\\s+([A-Za-z0-9_-]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(placeholder.trim());
            if (m.find()) {
                linkOutcome = m.group(1);
                String token = m.group(2);
                try {
                    int num = Integer.parseInt(token);
                    if (matchesByNumber != null) {
                        feeder = matchesByNumber.get(num);
                    }
                } catch (NumberFormatException ignored) {
                    // Not a number, check code
                }
                if (feeder == null && matchesByCode != null) {
                    feeder = matchesByCode.get(token.toUpperCase());
                }
            }
        }

        if (feeder != null) {
            return formatFeederPlaceholder(placeholder, targetMatch.getVenue(), feeder, linkOutcome);
        }

        return placeholder;
    }
}
