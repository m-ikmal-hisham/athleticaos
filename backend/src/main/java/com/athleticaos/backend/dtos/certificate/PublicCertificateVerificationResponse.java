package com.athleticaos.backend.dtos.certificate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Public PDPA-safe verification payload for /api/public/certificates/{code}.
 * Exposes only participation certificate details; never IC, DOB, email, phone, photo, or school details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicCertificateVerificationResponse {
    private String code;
    private String status; // VALID or REVOKED
    private String recipientName;
    private String teamName;
    private String categoryName;
    private String achievementText;
    private String tournamentName;
    private LocalDate tournamentStartDate;
    private LocalDate tournamentEndDate;
    private String tournamentVenue;
    private String organiserName;
    private LocalDate issueDate;
    private LocalDateTime revokedAt;
}
