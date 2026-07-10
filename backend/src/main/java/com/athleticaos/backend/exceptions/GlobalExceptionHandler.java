package com.athleticaos.backend.exceptions;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
@lombok.extern.slf4j.Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        if (ex.getMessage().contains("Person with this IC/Passport already exists")) {
            return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
        }
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

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        // Build a user-friendly message
        String message = "Database error: Duplicate record or constraint violation.";
        if (ex.getCause() != null && ex.getCause().getCause() != null) {
            String detail = ex.getCause().getCause().getMessage();
            if (detail.contains("ic_or_passport")) {
                message = "Person with this IC/Passport already exists";
            } else if (detail.contains("Duplicate entry")) {
                message = "This record already exists (duplicate entry).";
            }
        }
        // Fallback for H2 or other DBs if message structure differs
        if (ex.getMessage() != null && ex.getMessage().contains("ic_or_passport")) {
            message = "Person with this IC/Passport already exists";
        }

        return buildResponse(HttpStatus.CONFLICT, message);
    }

    @ExceptionHandler(DuplicateIcException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateIc(DuplicateIcException ex) {
        return buildResponseDetailed(HttpStatus.CONFLICT, ex.getMessage(), "DUPLICATE_IC");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, jakarta.servlet.http.HttpServletRequest request) {
        log.error("Unexpected error occurred: ", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred: " + ex.getMessage(),
                request);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message,
            jakarta.servlet.http.HttpServletRequest request) {
        return buildResponseDetailed(status, message, null, request);
    }

    private ResponseEntity<ErrorResponse> buildResponseDetailed(HttpStatus status, String message, String errorCode,
            jakarta.servlet.http.HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                null,
                errorCode,
                request.getRequestURI(),
                LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message) {
        return buildResponseDetailed(status, message, null);
    }

    private ResponseEntity<ErrorResponse> buildResponseDetailed(HttpStatus status, String message, String errorCode) {
        // Fallback for when request is not available or for internal calls if any
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                null,
                errorCode,
                null,
                LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }
}
