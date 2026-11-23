package com.athleticaos.backend.dtos.certificate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateRosterResponse {
    private UUID tournamentId;
    private int totalActivePlayers;
    private int totalIssued;
    private int totalRevoked;
    private List<CategoryGroup> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryGroup {
        private UUID categoryId;
        private String categoryName;
        private List<TeamGroup> teams;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamGroup {
        private UUID teamId;
        private String teamName;
        private String achievementText;
        private int activePlayerCount;
        private int issuedCount;
        private int revokedCount;
        private List<PlayerCertificateItem> players;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayerCertificateItem {
        private UUID playerId;
        private String fullName;
        private UUID certificateId;
        private String code;
        private String status; // NOT_ISSUED, VALID, REVOKED
        private LocalDateTime issuedAt;
        private LocalDateTime revokedAt;
    }
}
