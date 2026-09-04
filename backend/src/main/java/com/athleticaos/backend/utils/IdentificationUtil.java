package com.athleticaos.backend.utils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Phase 1 identification utility.
 *
 * <p>Provides normalisation and validation for new identification submissions.
 * This class contains NO persistence logic, NO logging, and NO SHA/HMAC
 * implementation (reserved for Phase 2).
 *
 * <p>Canonical identificationType values for new submissions:
 * <ul>
 *   <li>{@code MALAYSIAN_IC} — 12-digit national identification card</li>
 *   <li>{@code PASSPORT}     — international travel document</li>
 *   <li>{@code OTHER}        — any other document type</li>
 * </ul>
 *
 * <p>Legacy records stored with {@code IC}, {@code null}, or other values are
 * accepted as-is during reads and must not be rejected or re-validated.
 */
public final class IdentificationUtil {

    private static final DateTimeFormatter YYMMDD = DateTimeFormatter.ofPattern("yyMMdd");

    private IdentificationUtil() {
        // Utility class — not instantiable.
    }

    /**
     * Normalises a raw identification string.
     *
     * <p>Applies trim, uppercase (Locale.ROOT), and removal of all characters
     * that are not A-Z or 0-9. Returns {@code null} if the result is null or blank.
     *
     * @param raw the raw identification value supplied by the caller
     * @return the normalised value, or {@code null} if the input is null/blank/whitespace-only
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String result = raw.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        return result.isEmpty() ? null : result;
    }

    /**
     * Validates a normalised identification value for a new or replacement submission.
     *
     * <p>This method is only called when the caller has explicitly provided a new value.
     * It must NOT be called for existing records loaded from the database.
     *
     * <p>Validation rules:
     * <ul>
     *   <li>If {@code normalized} is {@code null} or blank, returns immediately (nothing to validate).</li>
     *   <li>If {@code type} is {@code "MALAYSIAN_IC"}, applies full IC validation against DOB and gender.</li>
     *   <li>If {@code type} is {@code "PASSPORT"} or {@code "OTHER"}, no format/DOB/gender rules apply.</li>
     *   <li>Unknown types are accepted to preserve forward-compatibility with legacy records.</li>
     * </ul>
     *
     * @param normalized the already-normalised identification value (output of {@link #normalize})
     * @param type       the caller-supplied identificationType (e.g. MALAYSIAN_IC, PASSPORT, OTHER)
     * @param dob        the person's date of birth — used for Malaysian IC DOB verification
     * @param gender     the person's gender ("MALE" or "FEMALE") — used for Malaysian IC parity check
     * @throws IllegalArgumentException if the value fails validation for the given type
     */
    public static void validateNewSubmission(String normalized, String type, LocalDate dob, String gender) {
        if (normalized == null || normalized.isBlank()) {
            return; // Nothing submitted — no validation required.
        }

        if ("MALAYSIAN_IC".equals(type)) {
            validateMalaysianIc(normalized, dob, gender);
        }
        // PASSPORT, OTHER, null type, and any unknown type are accepted without format rules.
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static void validateMalaysianIc(String normalized, LocalDate dob, String gender) {
        // Must be exactly 12 numeric digits.
        if (normalized.length() != 12) {
            throw new IllegalArgumentException(
                    "Malaysian IC must be exactly 12 digits after normalisation (got "
                    + normalized.length() + " characters).");
        }
        if (!normalized.chars().allMatch(Character::isDigit)) {
            throw new IllegalArgumentException(
                    "Malaysian IC must contain only numeric digits.");
        }

        // First 6 digits must equal DOB formatted as YYMMDD.
        if (dob != null) {
            String expectedPrefix = dob.format(YYMMDD);
            String actualPrefix = normalized.substring(0, 6);
            if (!expectedPrefix.equals(actualPrefix)) {
                throw new IllegalArgumentException(
                        "Malaysian IC date prefix does not match the provided date of birth.");
            }
        }

        // Last digit parity must match gender.
        if (gender != null) {
            int lastDigit = normalized.charAt(11) - '0';
            boolean isOdd = (lastDigit % 2) != 0;

            if (!"MALE".equalsIgnoreCase(gender) && !"FEMALE".equalsIgnoreCase(gender)) {
                throw new IllegalArgumentException(
                        "Malaysian IC validation requires gender MALE or FEMALE; got: " + gender);
            }
            if ("MALE".equalsIgnoreCase(gender) && !isOdd) {
                throw new IllegalArgumentException(
                        "Malaysian IC last digit must be odd for gender MALE.");
            }
            if ("FEMALE".equalsIgnoreCase(gender) && isOdd) {
                throw new IllegalArgumentException(
                        "Malaysian IC last digit must be even for gender FEMALE.");
            }
        }
    }
}
