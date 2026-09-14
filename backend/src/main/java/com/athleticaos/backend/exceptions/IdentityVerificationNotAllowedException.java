package com.athleticaos.backend.exceptions;

/**
 * Thrown when an identity verification or revocation attempt is not permitted due to
 * record state or prerequisite constraints.
 */
public class IdentityVerificationNotAllowedException extends RuntimeException {

    public IdentityVerificationNotAllowedException(String message) {
        super(message);
    }
}
