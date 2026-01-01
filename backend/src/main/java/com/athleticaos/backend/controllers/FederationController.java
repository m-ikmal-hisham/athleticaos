package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.federation.SanctioningCreateRequest;
import com.athleticaos.backend.dtos.federation.SanctioningRequestResponse;
import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.SanctioningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/federation")
@RequiredArgsConstructor
@Tag(name = "Federation", description = "Federation Governance and Sanctioning endpoints")
public class FederationController {

    private final OrganisationService organisationService;
    private final SanctioningService sanctioningService;
    private final com.athleticaos.backend.services.UserService userService;

    // --- Hierarchy ---

    @GetMapping("/hierarchy/{rootOrgId}")
    @PreAuthorize("isAuthenticated()") // Any authenticated user can view tree? Or public?
    @Operation(summary = "Get organization hierarchy tree")
    public ResponseEntity<Object> getOrganisationTree(@PathVariable UUID rootOrgId) {
        return ResponseEntity.ok(organisationService.getTree(rootOrgId));
    }

    // --- Sanctioning ---

    @PostMapping("/sanctioning")
    @PreAuthorize("hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Request sanctioning for a tournament")
    public ResponseEntity<SanctioningRequestResponse> requestSanctioning(
            @RequestBody @Valid SanctioningCreateRequest request) {
        return ResponseEntity.ok(sanctioningService.requestSanctioning(request));
    }

    @GetMapping("/sanctioning/incoming/{approverOrgId}")
    @PreAuthorize("hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Get incoming sanctioning requests for an organization")
    public ResponseEntity<List<SanctioningRequestResponse>> getIncomingRequests(@PathVariable UUID approverOrgId) {
        validateUserIsOrgAdmin(approverOrgId);
        return ResponseEntity.ok(sanctioningService.getRequestsForApprover(approverOrgId));
    }

    @GetMapping("/sanctioning/outgoing/{requesterOrgId}")
    @PreAuthorize("hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_CLUB_ADMIN')")
    @Operation(summary = "Get outgoing sanctioning requests from an organization")
    public ResponseEntity<List<SanctioningRequestResponse>> getOutgoingRequests(@PathVariable UUID requesterOrgId) {
        validateUserIsOrgAdmin(requesterOrgId);
        return ResponseEntity.ok(sanctioningService.getRequestsFromRequester(requesterOrgId));
    }

    @PostMapping("/sanctioning/{requestId}/approve")
    @PreAuthorize("hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Approve a sanctioning request")
    public ResponseEntity<SanctioningRequestResponse> approveSanctioning(@PathVariable UUID requestId,
            @RequestParam(required = false) String notes) {
        SanctioningRequestResponse request = sanctioningService.getSanctioningRequest(requestId);
        validateUserIsOrgAdmin(request.getApproverOrgId());
        return ResponseEntity.ok(sanctioningService.approveSanctioning(requestId, notes));
    }

    @PostMapping("/sanctioning/{requestId}/reject")
    @PreAuthorize("hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_SUPER_ADMIN')")
    @Operation(summary = "Reject a sanctioning request")
    public ResponseEntity<SanctioningRequestResponse> rejectSanctioning(@PathVariable UUID requestId,
            @RequestParam(required = false) String notes) {
        SanctioningRequestResponse request = sanctioningService.getSanctioningRequest(requestId);
        validateUserIsOrgAdmin(request.getApproverOrgId());
        return ResponseEntity.ok(sanctioningService.rejectSanctioning(requestId, notes));
    }

    private void validateUserIsOrgAdmin(UUID orgId) {
        com.athleticaos.backend.entities.User currentUser = userService.getCurrentUser();
        boolean isSuperAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN") || r.getName().equals("SUPER_ADMIN"));

        if (isSuperAdmin) {
            return;
        }

        java.util.Set<UUID> accessibleOrgIds = userService.resolveAccessibleOrganisationIds(currentUser);
        if (accessibleOrgIds == null || !accessibleOrgIds.contains(orgId)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not have permission to manage this organization.");
        }
    }
}
