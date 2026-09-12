package com.athleticaos.backend.services;

/**
 * Service for computing HMAC-SHA-256 hashes of identification values.
 *
 * <p>Uses a single secret key configured via {@code ATHLETICAOS_IDENTIFICATION_HMAC_SECRET}.
 * The canonical message format is: {@code athleticaos:identification:v<version>:<normalized-value>}
 *
 * <p><strong>Key rotation limitation:</strong> The current implementation uses one key for all
 * versions. Changing the secret invalidates all existing lookup hashes. Once plaintext is removed,
 * old hashes cannot be rehashed using a new key without the original plaintext values. A future
 * key rotation design must handle re-hashing from plaintext before plaintext columns are dropped.
 *
 * <p>A version number alone does not implement key rotation — it only changes the message prefix.
 * Currently only version 1 is supported.
 */
public interface IdentificationHashService {

    /**
     * Computes HMAC-SHA-256 hash using the active version.
     *
     * @param normalizedIdentification the already-normalised identification value
     * @return 64-char lowercase hex hash, or null if input is blank or service is unconfigured
     */
    String computeHash(String normalizedIdentification);

    /**
     * Computes HMAC-SHA-256 hash using a specific version.
     * Currently only version 1 is supported; unsupported versions are rejected.
     *
     * @param normalizedIdentification the already-normalised identification value
     * @param version the hash version (must be a supported positive integer)
     * @return 64-char lowercase hex hash, or null if input is blank or service is unconfigured
     * @throws IllegalArgumentException if version is unsupported
     */
    String computeHash(String normalizedIdentification, int version);

    /** Returns the currently active hash version (currently always 1). */
    int getActiveVersion();

    /** Returns true if the HMAC secret is configured and the service is operational. */
    boolean isConfigured();
}
