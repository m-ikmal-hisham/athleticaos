package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.services.OrganisationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.athleticaos.backend.dtos.person.RegisterPersonRequest;
import com.athleticaos.backend.dtos.team.PersonSummaryDTO;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organisations")
@RequiredArgsConstructor
@Slf4j
public class OrganisationController {

    private final OrganisationService organisationService;
    private final OrganisationRepository organisationRepository;
    private final AuditLogger auditLogger;

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
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<OrganisationResponse> createOrganisation(
            @RequestBody @Valid OrganisationCreateRequest request,
            HttpServletRequest httpRequest) {
        log.info("Admin creating organisation: {}", request.getName());
        OrganisationResponse response = organisationService.createOrganisation(request);

        // Audit log
        Organisation org = organisationRepository.findById(response.getId()).orElse(null);
        if (org != null) {
            auditLogger.logOrganisationCreated(org, httpRequest);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<OrganisationResponse>> createBulkOrganisations(
            @RequestBody @Valid List<OrganisationCreateRequest> requests,
            HttpServletRequest httpRequest) {
        log.info("Admin creating bulk organisations (size: {})", requests.size());
        List<OrganisationResponse> responses = organisationService.createBulkOrganisations(requests);
        
        // Audit log for bulk action
        auditLogger.logBulkAction("BULK_CREATE_ORGANISATIONS", "ORGANISATION", "Bulk imported " + requests.size() + " organisations", httpRequest);

        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<OrganisationResponse> updateOrganisation(
            @PathVariable UUID id,
            @RequestBody @Valid OrganisationUpdateRequest request,
            HttpServletRequest httpRequest) {
        log.info("Admin updating organisation {}", id);
        OrganisationResponse response = organisationService.updateOrganisation(id, request);

        // Audit log
        Organisation org = organisationRepository.findById(id).orElse(null);
        if (org != null) {
            auditLogger.logOrganisationUpdated(org, httpRequest);
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> deleteOrganisation(@PathVariable UUID id) {
        log.info("Admin deleting organisation: {}", id);
        organisationService.deleteOrganisation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/hierarchy/countries")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganisationResponse>> getCountries() {
        return ResponseEntity.ok(organisationService.getCountries());
    }

    @GetMapping("/hierarchy/states")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganisationResponse>> getStates(@RequestParam UUID countryId) {
        return ResponseEntity.ok(organisationService.getStates(countryId));
    }

    @GetMapping("/hierarchy/divisions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganisationResponse>> getDivisions(@RequestParam UUID stateId) {
        return ResponseEntity.ok(organisationService.getDivisions(stateId));
    }

    @GetMapping("/hierarchy/districts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganisationResponse>> getDistricts(@RequestParam UUID stateId) {
        return ResponseEntity.ok(organisationService.getDistricts(stateId));
    }

    @GetMapping("/hierarchy/children")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OrganisationResponse>> getChildren(@RequestParam UUID parentId) {
        return ResponseEntity.ok(organisationService.getChildren(parentId));
    }

    @GetMapping("/hierarchy/tree/{countryId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Object> getTree(@PathVariable UUID countryId) {
        return ResponseEntity.ok(organisationService.getTree(countryId));
    }

    @GetMapping("/{id}/persons")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TEAM_ADMIN', 'ROLE_OFFICIAL')")
    public ResponseEntity<List<PersonSummaryDTO>> getPersonsByOrganisation(@PathVariable UUID id) {
        log.info("Fetching persons for organisation: {}", id);
        return ResponseEntity.ok(organisationService.getPersonsByOrganisation(id));
    }

    @PostMapping("/{id}/persons")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TEAM_ADMIN')")
    public ResponseEntity<PersonSummaryDTO> registerPerson(
            @PathVariable UUID id,
            @RequestBody @Valid RegisterPersonRequest request) {
        log.info("Registering new person under organisation: {}", id);
        return ResponseEntity.ok(organisationService.registerPerson(id, request));
    }
}
