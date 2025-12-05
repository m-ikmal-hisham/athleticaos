package com.athleticaos.backend.dtos.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for audit log API endpoints.
 * Contains all relevant information for displaying audit logs to users.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    private UUID id;
    private LocalDateTime timestamp;
    private String actorEmail;
    private String actorRole;
    private String organisationName;
    private String actionType;
    private String entityType;
    private UUID entityId;
    private String entitySummary;
    private String detailsJson;
}
