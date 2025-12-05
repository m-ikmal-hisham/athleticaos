package com.athleticaos.backend.dtos.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for creating audit log entries.
 * Used by AuditLogger helper to construct audit logs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEntry {

    private String actionType;
    private String entityType;
    private UUID entityId;
    private String entitySummary;
    private String detailsJson;
}
