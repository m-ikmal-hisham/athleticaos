package com.athleticaos.backend.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Audit Log entity for tracking user actions across the system.
 * Provides governance, traceability, and compliance capabilities.
 * 
 * Retention Policy: Implement retention policy (12-24 months) with archival to
 * cold
 * storage.
 * 
 * SECURITY NOTE:
 * - Sensitive data (PII, passwords, tokens) MUST NOT be stored in 'detailsJson'
 * or 'entitySummary'.
 * - 'ipAddress' and 'actorEmail' are considered PII and should be handled
 * according to GDPR/CCPA regulations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_timestamp", columnList = "timestamp DESC"),
        @Index(name = "idx_audit_org", columnList = "organisation_id"),
        @Index(name = "idx_audit_actor", columnList = "actor_user_id"),
        @Index(name = "idx_audit_composite", columnList = "timestamp DESC, organisation_id, actor_user_id")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "actor_user_id", nullable = false)
    private UUID actorUserId;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(name = "actor_role", nullable = false)
    private String actorRole;

    @Column(name = "organisation_id")
    private UUID organisationId;

    @Column(name = "organisation_name")
    private String organisationName;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "entity_summary", length = 500)
    private String entitySummary;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;
}
