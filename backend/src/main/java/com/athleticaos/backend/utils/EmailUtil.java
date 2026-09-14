package com.athleticaos.backend.utils;

import java.util.Locale;

public final class EmailUtil {

    private EmailUtil() {
    }

    /**
     * Normalizes an email address.
     * Returns null if raw is null or whitespace-only; otherwise returns trimmed lowercase string.
     */
    public static String normalizeEmail(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }
}
