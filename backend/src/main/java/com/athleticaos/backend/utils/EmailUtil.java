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

    /**
     * Domain used for machine-generated placeholder addresses. ".invalid" is reserved by RFC 2606,
     * so nothing can ever be delivered to it. Any address on this domain is a stand-in, not a contact.
     */
    public static final String PLACEHOLDER_DOMAIN = "@placeholder.invalid";

    /**
     * Builds the placeholder address for a person, derived from their registration number,
     * e.g. AOS-000123 -> aos-000123@placeholder.invalid. Unique because registration numbers are.
     */
    public static String placeholderFor(String registrationNo) {
        if (registrationNo == null || registrationNo.trim().isEmpty()) {
            return null;
        }
        return registrationNo.trim().toLowerCase(Locale.ROOT) + PLACEHOLDER_DOMAIN;
    }

    /** True when the address is a machine-generated placeholder rather than a real contact. */
    public static boolean isPlaceholder(String email) {
        String normalized = normalizeEmail(email);
        return normalized != null && normalized.endsWith(PLACEHOLDER_DOMAIN);
    }

    /** True when there is no usable contact address: absent, blank, or a placeholder. */
    public static boolean isMissingOrPlaceholder(String email) {
        return normalizeEmail(email) == null || isPlaceholder(email);
    }
}
