package com.athleticaos.backend.enums;

import java.util.Locale;

/**
 * Canonical person gender options supported by AthleticaOS.
 */
public enum Gender {
    MALE,
    FEMALE;

    /**
     * Parses and canonicalizes a raw gender string.
     *
     * @param raw the raw gender string
     * @return the canonical Gender
     * @throws IllegalArgumentException if raw is null, blank, or not MALE/FEMALE (never echoes raw input)
     */
    public static Gender from(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("Gender must be MALE or FEMALE.");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "MALE" -> MALE;
            case "FEMALE" -> FEMALE;
            default -> throw new IllegalArgumentException("Gender must be MALE or FEMALE.");
        };
    }
}
