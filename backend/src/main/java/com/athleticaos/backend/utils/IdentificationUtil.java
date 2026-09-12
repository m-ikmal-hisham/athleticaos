package com.athleticaos.backend.utils;

import com.athleticaos.backend.enums.IdentificationType;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Phase 1 &amp; 2.1 identification utility.
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

    /**
     * X-mask pattern: 3+ consecutive characters composed only of X/space/hyphen
     * (must contain at least one X), optionally followed by at most 4 trailing alphanumerics.
     * A single leading X in a real passport (e.g. X1234567) must NOT match.
     */
    private static final Pattern X_MASK_PATTERN =
            Pattern.compile("^(?=[Xx \\-]*[Xx])[Xx \\-]{3,}[A-Za-z0-9]{0,4}$");

    /**
     * Placeholder values that are not real identification numbers.
     * Checked against the normalised (uppercase, alphanumeric-only) value.
     */
    private static final Set<String> PLACEHOLDER_VALUES = Set.of(
            "PRESENT", "MASKED", "REDACTED", "HIDDEN", "NONE",
            "NIL", "NULL", "NA", "UNKNOWN", "TBA", "TBC"
    );

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
     * Validates and normalises a raw identification value for a new or replacement submission.
     *
     * <p>This is the <b>primary entry point</b> for all identity write paths.
     * It operates on the <b>raw</b> (un-normalised) input so that mask characters
     * and placeholders can be detected before they are stripped by {@link #normalize}.
     *
     * <p>Processing order:
     * <ol>
     *   <li>Raw null/empty/whitespace → return {@code null} (nothing supplied).</li>
     *   <li>Raw contains mask characters ({@code * • ● #}) → reject.</li>
     *   <li>Trimmed raw matches an X-mask pattern → reject.</li>
     *   <li>Normalise; if result is {@code null} → reject (no letters or digits).</li>
     *   <li>Normalised value is a known placeholder → reject.</li>
     *   <li>Parse and enforce canonical identification type.</li>
     *   <li>Apply type-specific rules (MALAYSIAN_IC / PASSPORT / OTHER).</li>
     * </ol>
     *
     * @param raw    the raw identification value as supplied by the caller
     * @param type   the caller-supplied identificationType (e.g. MALAYSIAN_IC, PASSPORT, OTHER)
     * @param dob    the person's date of birth — used for Malaysian IC DOB verification
     * @param gender the person's gender ("MALE" or "FEMALE") — used for Malaysian IC parity check
     * @return the normalised identification value, or {@code null} if raw is null/empty/whitespace
     * @throws IllegalArgumentException if the value fails any validation rule
     */
    public static String validateAndNormalizeNewSubmission(String raw, String type, LocalDate dob, String gender) {
        // (a) raw null/empty/whitespace → nothing supplied
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }

        // (b) mask characters: * • ● #
        if (containsMaskCharacter(raw)) {
            throw new IllegalArgumentException(
                    "Identification value appears to be masked. Enter the full number.");
        }

        // (c) X-mask pattern (3+ consecutive X/space/hyphen, then ≤4 trailing alphanumerics)
        if (X_MASK_PATTERN.matcher(raw.trim()).matches()) {
            throw new IllegalArgumentException(
                    "Identification value appears to be masked. Enter the full number.");
        }

        // (d) normalise; if result is null, the raw contained no letters or digits
        String normalized = normalize(raw);
        if (normalized == null) {
            throw new IllegalArgumentException(
                    "Identification value must contain letters or digits.");
        }

        // (e) placeholder check
        if (PLACEHOLDER_VALUES.contains(normalized)) {
            throw new IllegalArgumentException(
                    "Identification value is a placeholder, not a real number.");
        }

        // (f) parse and enforce canonical type
        IdentificationType idType = IdentificationType.from(type);

        // (g) type-specific rules
        switch (idType) {
            case MALAYSIAN_IC -> validateMalaysianIc(normalized, dob, gender);
            case PASSPORT -> validatePassport(normalized);
            case OTHER -> validateOther(normalized);
        }

        // (h) return normalised value
        return normalized;
    }

    /**
     * Validates a normalised identification value for a new or replacement submission.
     *
     * @deprecated Use {@link #validateAndNormalizeNewSubmission(String, String, LocalDate, String)}
     *             instead. This method operates on already-normalised input and therefore cannot
     *             detect mask characters or placeholders that are stripped during normalisation.
     *             It is retained for backward compatibility with existing tests.
     *
     * @param normalized the already-normalised identification value (output of {@link #normalize})
     * @param type       the caller-supplied identificationType (e.g. MALAYSIAN_IC, PASSPORT, OTHER)
     * @param dob        the person's date of birth — used for Malaysian IC DOB verification
     * @param gender     the person's gender ("MALE" or "FEMALE") — used for Malaysian IC parity check
     * @throws IllegalArgumentException if the value fails validation for the given type
     */
    @Deprecated
    public static void validateNewSubmission(String normalized, String type, LocalDate dob, String gender) {
        if (normalized == null || normalized.isBlank()) {
            return; // Nothing submitted — no validation required.
        }

        // When nonblank identification is submitted, enforce canonical type
        IdentificationType idType = IdentificationType.from(type);

        if (idType == IdentificationType.MALAYSIAN_IC) {
            validateMalaysianIc(normalized, dob, gender);
        }
        // PASSPORT and OTHER skip Malaysian IC format/DOB/gender rules.
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Checks if the raw input contains any common mask characters.
     */
    private static boolean containsMaskCharacter(String raw) {
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c == '*' || c == '\u2022' || c == '\u25CF' || c == '#') {
                return true;
            }
        }
        return false;
    }

    /**
     * Validates a PASSPORT identification value (normalised).
     * Must be 6–20 characters and contain at least one digit.
     */
    private static void validatePassport(String normalized) {
        if (normalized.length() < 6 || normalized.length() > 20) {
            throw new IllegalArgumentException(
                    "Passport number must be between 6 and 20 characters.");
        }
        if (normalized.chars().noneMatch(Character::isDigit)) {
            throw new IllegalArgumentException(
                    "Passport number must contain at least one digit.");
        }
    }

    /**
     * Validates an OTHER identification value (normalised).
     * Must be 4–30 characters and contain at least one digit.
     */
    private static void validateOther(String normalized) {
        if (normalized.length() < 4 || normalized.length() > 30) {
            throw new IllegalArgumentException(
                    "Identification number must be between 4 and 30 characters.");
        }
        if (normalized.chars().noneMatch(Character::isDigit)) {
            throw new IllegalArgumentException(
                    "Identification number must contain at least one digit.");
        }
    }

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

        // DOB is strictly required for Malaysian IC validation.
        if (dob == null) {
            throw new IllegalArgumentException("Date of birth is required for Malaysian IC validation.");
        }
        String expectedPrefix = dob.format(YYMMDD);
        String actualPrefix = normalized.substring(0, 6);
        if (!expectedPrefix.equals(actualPrefix)) {
            throw new IllegalArgumentException(
                    "Malaysian IC date prefix does not match the provided date of birth.");
        }

        // Gender is strictly required for Malaysian IC validation.
        if (gender == null || gender.trim().isEmpty()) {
            throw new IllegalArgumentException("Gender is required for Malaysian IC validation.");
        }
        String normGender = gender.trim().toUpperCase(Locale.ROOT);
        if (!"MALE".equals(normGender) && !"FEMALE".equals(normGender)) {
            throw new IllegalArgumentException(
                    "Malaysian IC validation requires gender MALE or FEMALE; got: " + gender);
        }

        int lastDigit = normalized.charAt(11) - '0';
        boolean isOdd = (lastDigit % 2) != 0;

        if ("MALE".equals(normGender) && !isOdd) {
            throw new IllegalArgumentException(
                    "Malaysian IC last digit must be odd for gender MALE.");
        }
        if ("FEMALE".equals(normGender) && isOdd) {
            throw new IllegalArgumentException(
                    "Malaysian IC last digit must be even for gender FEMALE.");
        }
    }
}
