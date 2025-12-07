package com.athleticaos.backend.exceptions;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
@lombok.extern.slf4j.Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ErrorResponse> handleNullPointerException(NullPointerException ex,
            jakarta.servlet.http.HttpServletRequest request) {
        log.error("NullPointerException occurred: ", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "A system error occurred (Null Reference). Please contact support.", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        var fieldError = ex.getBindingResult().getFieldError();
        String message = fieldError != null
                ? String.format("Validation error: %s - %s", fieldError.getField(), fieldError.getDefaultMessage())
                : "Validation error";
        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return buildResponse(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, jakarta.servlet.http.HttpServletRequest request) {
        log.error("Unexpected error occurred: ", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred: " + ex.getMessage(),
                request);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message,
            jakarta.servlet.http.HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                null,
                request.getRequestURI(),
                LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message) {
        // Fallback for when request is not available or for internal calls if any
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                null,
                null,
                LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }
}
