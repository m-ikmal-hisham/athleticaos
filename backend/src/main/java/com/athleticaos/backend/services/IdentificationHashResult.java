package com.athleticaos.backend.services;

/**
 * Immutable result of an HMAC hash computation, ensuring hash and version
 * are always produced and consumed together.
 *
 * <p>Use {@link #compute(IdentificationHashService, String)} to produce a result
 * from a normalised identification value. Returns {@code null} if the service is
 * unconfigured or the input is blank — callers must null-check.
 *
 * @param hash    64-character lowercase hex HMAC-SHA-256 digest
 * @param version the hash version used (currently always 1)
 */
public record IdentificationHashResult(String hash, int version) {

    /**
     * Computes hash and version atomically. Returns null if the service is
     * unconfigured, the input is blank, or the hash computation returns null.
     *
     * @param service           the configured IdentificationHashService
     * @param normalizedValue   the already-normalised identification value
     * @return the result, or null if hashing was skipped
     */
    public static IdentificationHashResult compute(IdentificationHashService service, String normalizedValue) {
        if (service == null || !service.isConfigured()) {
            return null;
        }
        if (normalizedValue == null || normalizedValue.isBlank()) {
            return null;
        }
        String hash = service.computeHash(normalizedValue);
        if (hash == null) {
            return null;
        }
        return new IdentificationHashResult(hash, service.getActiveVersion());
    }
}
