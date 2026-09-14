package com.athleticaos.backend.exceptions;

/**
 * Thrown when an administrator attempts to verify an identity, but the entered
 * identification number does not match the record's stored hash.
 */
public class IdentityVerificationMismatchException extends RuntimeException {

    private static final String DEFAULT_MESSAGE =
            "The identification number entered does not match the record on file.";

    public IdentityVerificationMismatchException() {
        super(DEFAULT_MESSAGE);
    }

    public IdentityVerificationMismatchException(String message) {
        super(message);
    }
}
