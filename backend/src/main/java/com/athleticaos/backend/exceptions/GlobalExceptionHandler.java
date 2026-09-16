package com.athleticaos.backend.exceptions;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice
@lombok.extern.slf4j.Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        if (ex.getMessage() != null && ex.getMessage().contains("Person with this IC/Passport already exists")) {
            return buildResponseDetailed(HttpStatus.CONFLICT, ex.getMessage(), "DUPLICATE_IC", request);
        }
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ErrorResponse> handleNullPointerException(NullPointerException ex,
            HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString().substring(0, 8);
        log.error("NullPointerException occurred [correlationId={}]: ", correlationId, ex);
        return buildResponseDetailed(HttpStatus.INTERNAL_SERVER_ERROR,
                "A system error occurred (Null Reference). Please contact support with reference ID: " + correlationId,
                correlationId, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        var fieldError = ex.getBindingResult().getFieldError();
        String message = fieldError != null
                ? String.format("Validation error: %s - %s", fieldError.getField(), fieldError.getDefaultMessage())
                : "Validation error";
        return buildResponse(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleHandlerMethodValidation(
            HandlerMethodValidationException ex,
            HttpServletRequest request) {
        List<String> errors = new ArrayList<>();
        for (var result : ex.getAllValidationResults()) {
            if (result instanceof ParameterErrors paramErrors) {
                Integer index = paramErrors.getContainerIndex();
                for (var error : paramErrors.getAllErrors()) {
                    String prefix = (index != null) ? String.format("Row %d: ", index + 1) : "";
                    if (error instanceof FieldError fe) {
                        errors.add(String.format("%s%s - %s", prefix, fe.getField(), fe.getDefaultMessage()));
                    } else if (error.getDefaultMessage() != null) {
                        errors.add(String.format("%s%s", prefix, error.getDefaultMessage()));
                    }
                }
            } else {
                for (var resolvable : result.getResolvableErrors()) {
                    if (resolvable instanceof FieldError fe) {
                        errors.add(String.format("%s - %s", fe.getField(), fe.getDefaultMessage()));
                    } else if (resolvable.getDefaultMessage() != null) {
                        errors.add(resolvable.getDefaultMessage());
                    }
                }
            }
        }
        String message = errors.isEmpty() ? "Validation failure" : String.join(", ", errors);
        return buildResponse(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex,
            HttpServletRequest request) {
        String message = String.format("Required request parameter '%s' is missing", ex.getParameterName());
        return buildResponse(HttpStatus.BAD_REQUEST, message, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "Access denied", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request) {
        String sqlState = extractSqlState(ex);
        String constraintName = extractConstraintName(ex);

        HttpStatus status;
        String message;
        String errorCode = null;

        if ("23505".equals(sqlState)) {
            status = HttpStatus.CONFLICT;
            boolean isEmailConstraint = constraintName != null
                    && constraintName.toLowerCase(Locale.ROOT).contains("email");

            if (isEmailConstraint) {
                message = "A person with this email already exists.";
                errorCode = "DUPLICATE_EMAIL";
            } else {
                message = "A record with this identifier already exists.";
            }
        } else if ("23502".equals(sqlState)) {
            status = HttpStatus.BAD_REQUEST;
            message = "Required data is missing or invalid.";
        } else if ("23514".equals(sqlState) || "23513".equals(sqlState)) {
            status = HttpStatus.BAD_REQUEST;
            message = "Data validation constraint violated.";
        } else {
            status = HttpStatus.CONFLICT;
            message = "Database constraint violation.";
        }

        return buildResponseDetailed(status, message, errorCode, request);
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex, HttpServletRequest request) {
        return buildResponseDetailed(HttpStatus.CONFLICT, "A person with this email already exists.", "DUPLICATE_EMAIL", request);
    }

    @ExceptionHandler(EmailRequiredException.class)
    public ResponseEntity<ErrorResponse> handleEmailRequired(EmailRequiredException ex, HttpServletRequest request) {
        return buildResponseDetailed(HttpStatus.BAD_REQUEST, ex.getMessage(), "EMAIL_REQUIRED", request);
    }

    @ExceptionHandler(PossibleDuplicatePersonException.class)
    public ResponseEntity<com.athleticaos.backend.dtos.person.PossibleDuplicateErrorResponse> handlePossibleDuplicatePerson(
            PossibleDuplicatePersonException ex, HttpServletRequest request) {
        com.athleticaos.backend.dtos.person.PossibleDuplicateErrorResponse error = new com.athleticaos.backend.dtos.person.PossibleDuplicateErrorResponse(
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                "A person with the same name, date of birth and gender already exists.",
                null,
                "POSSIBLE_DUPLICATE_PERSON",
                request != null ? request.getRequestURI() : null,
                LocalDateTime.now(),
                ex.getMatches(),
                ex.getOtherOrganisationMatches()
        );
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(RecordVerificationNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleRecordVerificationNotAllowed(
            RecordVerificationNotAllowedException ex, HttpServletRequest request) {
        return buildResponseDetailed(HttpStatus.CONFLICT, ex.getMessage(),
                "RECORD_VERIFICATION_NOT_ALLOWED", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unexpected error occurred [correlationId={}]: ", correlationId, ex);
        String message = "An unexpected error occurred. Please contact support with reference ID: " + correlationId;
        return buildResponseDetailed(HttpStatus.INTERNAL_SERVER_ERROR, message, correlationId, request);
    }

    private String extractSqlState(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof ConstraintViolationException cve) {
                if (cve.getSQLState() != null && !cve.getSQLState().isBlank()) {
                    return cve.getSQLState();
                }
            }
            if (current instanceof SQLException sqle) {
                if (sqle.getSQLState() != null && !sqle.getSQLState().isBlank()) {
                    return sqle.getSQLState();
                }
            }
            current = current.getCause();
        }
        return null;
    }

    private String extractConstraintName(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            if (current instanceof ConstraintViolationException cve) {
                if (cve.getConstraintName() != null && !cve.getConstraintName().isBlank()) {
                    return cve.getConstraintName().toLowerCase(Locale.ROOT);
                }
            }
            current = current.getCause();
        }
        return null;
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, HttpServletRequest request) {
        return buildResponseDetailed(status, message, null, request);
    }

    private ResponseEntity<ErrorResponse> buildResponseDetailed(HttpStatus status, String message, String errorCode,
            HttpServletRequest request) {
        ErrorResponse error = new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                null,
                errorCode,
                request != null ? request.getRequestURI() : null,
                LocalDateTime.now());
        return new ResponseEntity<>(error, status);
    }
}
