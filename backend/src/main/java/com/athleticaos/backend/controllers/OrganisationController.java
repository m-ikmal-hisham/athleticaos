package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.services.OrganisationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organisations")
@RequiredArgsConstructor
public class OrganisationController {

    private final OrganisationService organisationService;

    @GetMapping
    public ResponseEntity<List<OrganisationResponse>> getAllOrganisations() {
        return ResponseEntity.ok(organisationService.getAllOrganisations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrganisationResponse> getOrganisationById(@PathVariable UUID id) {
        return ResponseEntity.ok(organisationService.getOrganisationById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPER_ADMIN')")
    public ResponseEntity<OrganisationResponse> createOrganisation(
            @RequestBody @Valid OrganisationCreateRequest request) {
        return ResponseEntity.ok(organisationService.createOrganisation(request));
    }
}
