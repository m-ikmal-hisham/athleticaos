package com.athleticaos.backend.exceptions;

public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException() {
        super("A person with this email already exists.");
    }

    public DuplicateEmailException(String message) {
        super(message);
    }
}
