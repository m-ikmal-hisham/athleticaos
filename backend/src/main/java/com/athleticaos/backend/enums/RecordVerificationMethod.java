package com.athleticaos.backend.enums;

import java.util.Locale;

/**
 * Method of record verification used by an administrator.
 */
public enum RecordVerificationMethod {
    PRE_REGISTRATION_RECORD,
    DOCUMENT_SIGHTED;

    /**
     * Parses and canonicalizes a raw verification method string.
     * Fixed error message, never echoing the input string.
     *
     * @param raw the raw method string
     * @return the canonical RecordVerificationMethod
     * @throws IllegalArgumentException if raw is null, blank, or unrecognized
     */
    public static RecordVerificationMethod from(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("Verification method is required.");
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PRE_REGISTRATION_RECORD" -> PRE_REGISTRATION_RECORD;
            case "DOCUMENT_SIGHTED" -> DOCUMENT_SIGHTED;
            default -> throw new IllegalArgumentException(
                    "Invalid verification method. Allowed values are: PRE_REGISTRATION_RECORD, DOCUMENT_SIGHTED.");
        };
    }
}
