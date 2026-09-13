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
            "Changing date of birth or gender for a Malaysian IC holder requires re-entering the IC number.";

    public IdentificationReentryRequiredException() {
        super(MESSAGE);
    }
}
