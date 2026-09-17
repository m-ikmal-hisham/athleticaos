package com.athleticaos.backend.dtos.person;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for administrator record verification.
 * Disallows unknown properties to prevent any identification numbers from being submitted.
 */
@JsonIgnoreProperties(ignoreUnknown = false)
public record RecordVerificationRequest(
        @NotBlank(message = "Verification method is required")
        String method,

        @NotNull(message = "Attestation confirmation is required")
        Boolean attested) {

    @Override
    public String toString() {
        return "RecordVerificationRequest[method=" + method + ", attested=" + attested + "]";
    }
}
