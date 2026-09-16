package com.athleticaos.backend.exceptions;

public class EmailRequiredException extends RuntimeException {

    public EmailRequiredException() {
        super("Email is required.");
    }

    public EmailRequiredException(String message) {
        super(message != null && !message.isBlank() ? message : "Email is required.");
    }
}
