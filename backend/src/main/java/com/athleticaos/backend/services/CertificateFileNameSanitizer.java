package com.athleticaos.backend.services;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/**
 * Sanitizes category, team, and player names for safe ZIP folder/file paths across OSes.
 */
@Component
public class CertificateFileNameSanitizer {

    private static final int MAX_SEGMENT_LENGTH = 80;

    public String sanitizeSegment(String raw, String fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        String cleaned = raw
                .replaceAll("[\\p{Cntrl}]", " ")
                .replaceAll("[/\\\\:*?\"<>|]", " ")
                .replace("..", " ")
                .replaceAll("\\s+", " ")
                .trim();

        // Remove leading/trailing dots which can cause issues on Windows/macOS
        while (cleaned.startsWith(".")) {
            cleaned = cleaned.substring(1).trim();
        }
        while (cleaned.endsWith(".")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1).trim();
        }

        if (cleaned.isEmpty()) {
            return fallback;
        }
        if (cleaned.length() > MAX_SEGMENT_LENGTH) {
            cleaned = cleaned.substring(0, MAX_SEGMENT_LENGTH).trim();
        }
        return cleaned.isEmpty() ? fallback : cleaned;
    }

    /**
     * Produces a unique PDF filename within a team folder, appending " (2)", " (3)", etc.
     * when two players share the same sanitized name.
     */
    public String uniquePdfFileName(String playerName, Set<String> usedLowercaseNames) {
        String base = sanitizeSegment(playerName, "Participant");
        String candidate = base + ".pdf";
        if (usedLowercaseNames.add(candidate.toLowerCase(Locale.ROOT))) {
            return candidate;
        }
        int suffix = 2;
        while (true) {
            String next = base + " (" + suffix + ").pdf";
            if (usedLowercaseNames.add(next.toLowerCase(Locale.ROOT))) {
                return next;
            }
            suffix++;
        }
    }
}
