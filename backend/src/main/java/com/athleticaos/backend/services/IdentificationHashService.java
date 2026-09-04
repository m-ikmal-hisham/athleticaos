package com.athleticaos.backend.services;

public interface IdentificationHashService {
    String computeHash(String normalizedIdentification);
    String computeHash(String normalizedIdentification, int version);
    int getActiveVersion();
    boolean isConfigured();

    default String hash(String normalizedIdentification) {
        return computeHash(normalizedIdentification);
    }

    default String hashWithVersion(String normalizedIdentification, int version) {
        return computeHash(normalizedIdentification, version);
    }

    default int getCurrentVersion() {
        return getActiveVersion();
    }
}
