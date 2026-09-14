package com.athleticaos.backend.dtos.person;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for administrator identity verification.
 */
public record IdentityVerificationRequest(
        @NotBlank(message = "Identification number is required")
        String identificationValue,

        @NotBlank(message = "Verification method is required")
        String method,

        @NotNull(message = "Attestation confirmation is required")
        Boolean attested) {

    @Override
    public String toString() {
        return "IdentityVerificationRequest[identificationValue=REDACTED, method=" + method + ", attested=" + attested + "]";
    }
}
