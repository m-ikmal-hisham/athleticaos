package com.athleticaos.backend.services;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Locale;

/**
 * Generates and formats short, unambiguous 10-character certificate verification codes.
 * Excludes look-alike characters (0, O, 1, I, L).
 */
@Component
public class CertificateCodeGenerator {

    public static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    public static final int CODE_LENGTH = 10;

    private final SecureRandom random = new SecureRandom();

    public String generate() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    /**
     * Normalizes user-entered or formatted code (strips hyphens/spaces, uppercases).
     */
    public String normalize(String input) {
        if (input == null) {
            return "";
        }
        return input.replaceAll("[\\s-]+", "").toUpperCase(Locale.ROOT);
    }

    /**
     * Formats a 10-char normalized code as XXXX-XXXX-XX for display on certificates and UI.
     */
    public String format(String rawCode) {
        String normalized = normalize(rawCode);
        if (normalized.length() != CODE_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, 4) + "-" + normalized.substring(4, 8) + "-" + normalized.substring(8, 10);
    }

    public boolean isValidNormalized(String code) {
        if (code == null || code.length() != CODE_LENGTH) {
            return false;
        }
        for (int i = 0; i < code.length(); i++) {
            if (ALPHABET.indexOf(code.charAt(i)) < 0) {
                return false;
            }
        }
        return true;
    }
}
