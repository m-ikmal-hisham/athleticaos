package com.athleticaos.backend.dtos.certificate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateIssueResponse {
    private int createdCount;
    private int updatedCount;
    private int skippedRevokedCount;
    private int totalValidCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CertificateSummaryDto {
        private UUID id;
        private String code;
        private String recipientName;
        private String status; // VALID, REVOKED
        private LocalDateTime issuedAt;
        private LocalDateTime revokedAt;
    }
}
