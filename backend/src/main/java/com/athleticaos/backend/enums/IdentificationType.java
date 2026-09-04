package com.athleticaos.backend.enums;

import java.util.Locale;

/**
 * Canonical identification types supported for new and replacement identification records.
 */
public enum IdentificationType {
    MALAYSIAN_IC,
    PASSPORT,
    OTHER;

    /**
     * Parses and canonicalizes a raw type string.
     *
     * @param raw the raw identification type string
     * @return the canonical IdentificationType
     * @throws IllegalArgumentException if raw is null, blank, or unknown
     */
    public static IdentificationType from(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("Identification type is required when identification is submitted.");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "MALAYSIAN_IC" -> MALAYSIAN_IC;
            case "PASSPORT" -> PASSPORT;
            case "OTHER" -> OTHER;
            default -> throw new IllegalArgumentException(
                    "Invalid identification type: '" + raw + "'. Allowed canonical values are: MALAYSIAN_IC, PASSPORT, OTHER.");
        };
    }

    /**
     * Checks whether the given string matches a canonical identification type.
     */
    public static boolean isValid(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return false;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return normalized.equals("MALAYSIAN_IC") || normalized.equals("PASSPORT") || normalized.equals("OTHER");
    }
}
