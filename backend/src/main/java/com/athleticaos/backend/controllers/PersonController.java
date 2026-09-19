package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.person.PersonResponseDTO;
import com.athleticaos.backend.dtos.person.PersonUpdateRequest;
import com.athleticaos.backend.services.PersonService;
import com.athleticaos.backend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/persons")
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;
    private final PersonRepository personRepository;
    private final PlayerRepository playerRepository;
    private final TeamStaffRepository teamStaffRepository;
    private final OfficialRegistryRepository officialRegistryRepository;
    private final OrganisationPersonRepository organisationPersonRepository;
    private final com.athleticaos.backend.audit.AuditLogger auditLogger;
    private final com.athleticaos.backend.repositories.OrganisationRepository organisationRepository;
    private final com.athleticaos.backend.services.RecordVerificationService recordVerificationService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Page<PersonResponseDTO>> getAllPersons(
            @PageableDefault(size = 50, sort = "firstName", direction = Sort.Direction.ASC) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean missingEmail) {
        return ResponseEntity.ok(personService.getAllPersons(pageable, search, missingEmail));
    }

    @GetMapping("/organisation/{orgId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TEAM_ADMIN')")
    public ResponseEntity<Page<PersonResponseDTO>> getPersonsByOrganisation(
            @PathVariable UUID orgId,
            @PageableDefault(size = 50, sort = "firstName", direction = Sort.Direction.ASC) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean missingEmail) {
        return ResponseEntity.ok(personService.getPersonsByOrganisation(orgId, pageable, search, missingEmail));
    }

    @PostMapping("/organisation/{orgId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<PersonResponseDTO> createPerson(
            @PathVariable UUID orgId,
            @RequestBody @Valid com.athleticaos.backend.dtos.person.CreatePersonRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        PersonResponseDTO response = personService.createPerson(orgId, request);
        if (response != null && response.getId() != null) {
            com.athleticaos.backend.entities.Person person = personRepository.findById(UUID.fromString(response.getId())).orElse(null);
            com.athleticaos.backend.entities.Organisation org = organisationRepository.findById(orgId).orElse(null);
            if (person != null) {
                auditLogger.logPersonCreated(person, org != null ? org.getName() : null, httpRequest);
            }
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN', 'ROLE_TEAM_ADMIN', 'ROLE_OFFICIAL')")
    public ResponseEntity<PersonResponseDTO> getPerson(@PathVariable UUID id) {
        return ResponseEntity.ok(personService.getPersonByIdInScope(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    @SuppressWarnings("null")
    public ResponseEntity<PersonResponseDTO> updatePerson(
            @PathVariable UUID id,
            @RequestBody @Valid PersonUpdateRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        PersonResponseDTO response = personService.updatePerson(id, request);
        com.athleticaos.backend.entities.Person person = personRepository.findById(id).orElse(null);
        if (person != null) {
            auditLogger.logPersonUpdated(person, httpRequest);
        }
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<Void> deletePerson(@PathVariable UUID id) {
        personService.deletePerson(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unlinked-users/{orgId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<List<com.athleticaos.backend.dtos.user.UserResponse>> getUnlinkedUsers(@PathVariable UUID orgId) {
        return ResponseEntity.ok(personService.getUnlinkedUsersInScope(orgId));
    }

    @PostMapping("/{id}/link-user/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN')")
    public ResponseEntity<PersonResponseDTO> linkToUser(@PathVariable UUID id, @PathVariable UUID userId) {
        return ResponseEntity.ok(personService.linkToUser(id, userId));
    }

    @GetMapping("/debug/counts")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<java.util.Map<String, Long>> getDebugCounts() {
        java.util.Map<String, Long> counts = new java.util.HashMap<>();
        counts.put("totalPersons", personRepository.count());
        counts.put("totalPlayers", playerRepository.count());
        counts.put("totalStaff", teamStaffRepository.count());
        counts.put("totalOfficials", officialRegistryRepository.count());
        counts.put("totalOrgPersons", organisationPersonRepository.count());
        return ResponseEntity.ok(counts);
    }

    @PostMapping("/{id}/record-verification")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<PersonResponseDTO> verifyRecord(
            @PathVariable UUID id,
            @RequestBody @Valid com.athleticaos.backend.dtos.person.RecordVerificationRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        return ResponseEntity.ok(recordVerificationService.verify(id, request, httpRequest));
    }

    @DeleteMapping("/{id}/record-verification")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<PersonResponseDTO> revokeRecordVerification(
            @PathVariable UUID id,
            jakarta.servlet.http.HttpServletRequest httpRequest) {
        return ResponseEntity.ok(recordVerificationService.revoke(id, httpRequest));
    }
}
