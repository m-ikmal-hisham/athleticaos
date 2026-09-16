package com.athleticaos.backend.exceptions;

/**
 * Thrown when a record verification or revocation attempt is not permitted due to
 * record state or prerequisite constraints.
 */
public class RecordVerificationNotAllowedException extends RuntimeException {

    public RecordVerificationNotAllowedException(String message) {
        super(message);
    }
}
