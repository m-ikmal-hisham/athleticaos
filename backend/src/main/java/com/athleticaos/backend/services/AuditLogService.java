package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.audit.AuditLogEntry;
import com.athleticaos.backend.dtos.audit.AuditLogResponse;
import com.athleticaos.backend.entities.AuditLog;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.AuditLogRepository;
import com.athleticaos.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Creates an audit log entry.
     * Automatically populates actor information from SecurityContext.
     * 
     * @param entry     The audit log entry details
     * @param ipAddress The IP address of the request (nullable)
     * @param userAgent The user agent of the request (nullable)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @SuppressWarnings("null")
    public void log(AuditLogEntry entry, String ipAddress, String userAgent) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            String actorRole = user.getRoles().stream()
                    .findFirst()
                    .map(role -> role.getName())
                    .orElse("UNKNOWN");

            AuditLog log = AuditLog.builder()
                    .timestamp(LocalDateTime.now())
                    .actorUserId(user.getId())
                    .actorEmail(user.getEmail())
                    .actorRole(actorRole)
                    .organisationId(user.getOrganisation() != null ? user.getOrganisation().getId() : null)
                    .organisationName(user.getOrganisation() != null ? user.getOrganisation().getName() : null)
                    .actionType(entry.getActionType())
                    .entityType(entry.getEntityType())
                    .entityId(entry.getEntityId())
                    .entitySummary(entry.getEntitySummary())
                    .detailsJson(entry.getDetailsJson())
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .build();

            auditLogRepository.save(log);
        }
    }

    /**
     * Retrieves recent audit logs globally (SUPER_ADMIN only).
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getRecentGlobal(Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findAllByOrderByTimestampDesc(pageable);
        return logs.map(this::mapToResponse);
    }

    /**
     * Retrieves recent audit logs for a specific organisation.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getRecentForOrg(UUID orgId, Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findByOrganisationIdOrderByTimestampDesc(orgId, pageable);
        return logs.map(this::mapToResponse);
    }

    /**
     * Retrieves recent audit logs for a specific user.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getRecentForUser(UUID userId, Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findByActorUserIdOrderByTimestampDesc(userId, pageable);
        return logs.map(this::mapToResponse);
    }

    /**
     * Retrieves recent audit logs for a specific entity.
     */
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getRecentForEntity(String entityType, UUID entityId, Pageable pageable) {
        Page<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId,
                pageable);
        return logs.map(this::mapToResponse);
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp())
                .actorEmail(log.getActorEmail())
                .actorRole(log.getActorRole())
                .organisationName(log.getOrganisationName())
                .actionType(log.getActionType())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .entitySummary(log.getEntitySummary())
                .detailsJson(log.getDetailsJson())
                .build();
    }
}
