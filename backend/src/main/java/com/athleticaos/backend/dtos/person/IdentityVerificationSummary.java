package com.athleticaos.backend.dtos.person;

import java.time.LocalDateTime;

/**
 * Summary of a person's identity verification attestation.
 */
public record IdentityVerificationSummary(
        String status,
        LocalDateTime verifiedAt,
        String verifiedByName,
        String method) {
}
