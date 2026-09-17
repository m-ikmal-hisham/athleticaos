package com.athleticaos.backend.dtos.person;

import java.time.LocalDateTime;

/**
 * Summary of a person's record verification attestation.
 */
public record RecordVerificationSummary(
        String status,
        LocalDateTime verifiedAt,
        String verifiedByName,
        String method) {
}
