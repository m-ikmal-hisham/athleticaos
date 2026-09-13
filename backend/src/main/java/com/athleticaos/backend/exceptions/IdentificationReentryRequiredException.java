package com.athleticaos.backend.exceptions;

/**
 * Thrown when an update changes DOB or gender for a person whose stored
 * identification type is MALAYSIAN_IC, but the request does not include
 * a re-entered IC value for re-validation.
 *
 * <p>The message is intentionally fixed and contains no identity data,
 * no date of birth, and no gender value.
 */
public class IdentificationReentryRequiredException extends RuntimeException {

    private static final String MESSAGE =
            "Changing date of birth or gender requires re-entering the identification number.";

    public IdentificationReentryRequiredException() {
        super(MESSAGE);
    }
}
