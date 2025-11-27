package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;
import com.athleticaos.backend.services.OrganisationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organisations")
@RequiredArgsConstructor
@Slf4j
public class OrganisationController {

    private final OrganisationService organisationService;

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    public ResponseEntity<List<OrganisationResponse>> getAllOrganisations() {
        return ResponseEntity.ok(organisationService.getAllOrganisations());
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    public ResponseEntity<OrganisationResponse> getOrganisationById(@PathVariable UUID id) {
        return ResponseEntity.ok(organisationService.getOrganisationById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<OrganisationResponse> createOrganisation(
            @RequestBody @Valid OrganisationCreateRequest request) {
        log.info("Admin creating organisation: {}", request.getName());
        return ResponseEntity.ok(organisationService.createOrganisation(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<OrganisationResponse> updateOrganisation(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationUpdateRequest request) {
        log.info("Admin updating organisation {}", id);
        return ResponseEntity.ok(organisationService.updateOrganisation(id, request));
    }
}
