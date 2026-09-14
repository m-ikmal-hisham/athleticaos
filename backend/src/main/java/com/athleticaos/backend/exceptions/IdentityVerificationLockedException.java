package com.athleticaos.backend.exceptions;

/**
 * Thrown when an administrator is temporarily locked out of verifying a person's record
 * after repeated mismatches.
 */
public class IdentityVerificationLockedException extends RuntimeException {

    private static final String DEFAULT_MESSAGE =
            "Too many verification attempts for this record. Try again in 15 minutes.";

    public IdentityVerificationLockedException() {
        super(DEFAULT_MESSAGE);
    }

    public IdentityVerificationLockedException(String message) {
        super(message);
    }
}
