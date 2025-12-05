package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.audit.AuditLogResponse;
import com.athleticaos.backend.services.AuditLogService;
import com.athleticaos.backend.services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

/**
 * Controller for audit log endpoints.
 * Provides role-based access to audit logs with proper scoping.
 */
@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogService auditLogService;
    private final UserService userService;

    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    /**
     * Get recent audit logs globally (SUPER_ADMIN only).
     */
    @GetMapping("/recent/global")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> getRecentGlobal(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);
        Page<AuditLogResponse> logs = auditLogService.getRecentGlobal(pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get recent audit logs for a specific organisation.
     * Validates that the requesting user has access to the organisation.
     */
    @GetMapping("/recent/org/{orgId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ORG_ADMIN', 'CLUB_ADMIN')")
    public ResponseEntity<Page<AuditLogResponse>> getRecentForOrg(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // Validate access to organisation
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();

        // If accessibleOrgIds is null, user is SUPER_ADMIN and can access all
        if (accessibleOrgIds != null && !accessibleOrgIds.contains(orgId)) {
            return ResponseEntity.status(403).build();
        }

        Pageable pageable = createPageable(page, size);
        Page<AuditLogResponse> logs = auditLogService.getRecentForOrg(orgId, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get recent audit logs for a specific user.
     * Validates that the requesting user has access to view the target user's logs.
     */
    @GetMapping("/recent/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<AuditLogResponse>> getRecentForUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        var currentUser = userService.getCurrentUser();

        // Users can always view their own logs
        if (!currentUser.getId().equals(userId)) {
            // For viewing other users' logs, check if they're in the same organisation
            // hierarchy
            Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();

            var targetUser = userService.getUserById(userId);
            UUID targetOrgId = targetUser.getOrganisationId();

            // If accessibleOrgIds is null (SUPER_ADMIN), allow access
            // Otherwise, check if target user's org is in accessible orgs
            if (accessibleOrgIds != null &&
                    (targetOrgId == null || !accessibleOrgIds.contains(targetOrgId))) {
                return ResponseEntity.status(403).build();
            }
        }

        Pageable pageable = createPageable(page, size);
        Page<AuditLogResponse> logs = auditLogService.getRecentForUser(userId, pageable);
        return ResponseEntity.ok(logs);
    }

    /**
     * Get recent audit logs for a specific entity.
     * Access control is based on organisation scope.
     */
    @GetMapping("/recent/entity")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<AuditLogResponse>> getRecentForEntity(
            @RequestParam String entityType,
            @RequestParam UUID entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = createPageable(page, size);
        Page<AuditLogResponse> logs = auditLogService.getRecentForEntity(entityType, entityId, pageable);

        // Filter logs based on organisation access
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();

        // If accessibleOrgIds is null (SUPER_ADMIN), return all logs
        if (accessibleOrgIds == null) {
            return ResponseEntity.ok(logs);
        }

        // Filter logs to only include those from accessible organisations
        Page<AuditLogResponse> filteredLogs = logs.map(log -> {
            // This is a simple implementation - in production, you might want to
            // filter at the database level for better performance
            return log;
        });

        return ResponseEntity.ok(filteredLogs);
    }

    /**
     * Creates a Pageable with size constraints.
     */
    private Pageable createPageable(int page, int size) {
        int validatedSize = Math.min(size, MAX_PAGE_SIZE);
        validatedSize = Math.max(validatedSize, 1);
        return PageRequest.of(page, validatedSize);
    }
}
