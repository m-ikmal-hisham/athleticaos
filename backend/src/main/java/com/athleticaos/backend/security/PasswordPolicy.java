package com.athleticaos.backend.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Server-side rules for every password a person chooses or an admin sets.
 * Length-first (NIST SP 800-63B style) plus a denylist. The frontend mirrors these rules for UX only.
 */
@Component
public class PasswordPolicy {

    public static final int MIN_LENGTH = 12;
    /** BCrypt only uses the first 72 bytes; longer inputs would be silently truncated. */
    public static final int MAX_BYTES = 72;

    private static final List<String> BANNED_FRAGMENTS = List.of(
            "password", "athleticaos", "ragbi", "qwerty", "letmein", "welcome", "12345678");

    /**
     * SHA-256 (hex) of lower-cased credentials previously published in this repository (QA21-07).
     * Never add plaintext here.
     */
    private static final Set<String> COMPROMISED_SHA256 = Set.of(
            "0ec8fb63c61b0ed145190a7dddd4dacfa2163b63feb1b915dc5f0493a382eee9",
            "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f");

    public void validate(String password, String email) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException("Password must be at least " + MIN_LENGTH + " characters");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new IllegalArgumentException("Password must be at most " + MAX_BYTES + " bytes");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (COMPROMISED_SHA256.contains(sha256Hex(lower))) {
            throw new IllegalArgumentException("This password is known to be compromised. Choose a different one");
        }
        if (BANNED_FRAGMENTS.stream().anyMatch(lower::contains)) {
            throw new IllegalArgumentException("Password must not contain common words or the product name");
        }
        if (email != null && email.contains("@")) {
            String localPart = email.substring(0, email.indexOf('@')).toLowerCase(Locale.ROOT);
            if (localPart.length() >= 4 && lower.contains(localPart)) {
                throw new IllegalArgumentException("Password must not contain the email address");
            }
        }
        if (password.chars().distinct().count() < 6) {
            throw new IllegalArgumentException("Password is too repetitive");
        }
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
