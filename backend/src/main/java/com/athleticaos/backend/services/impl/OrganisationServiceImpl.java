package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.services.OrganisationService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganisationServiceImpl implements OrganisationService {

    private final OrganisationRepository organisationRepository;

    public List<OrganisationResponse> getAllOrganisations() {
        return organisationRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public OrganisationResponse getOrganisationById(UUID id) {
        return organisationRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public OrganisationResponse createOrganisation(OrganisationCreateRequest request) {
        log.info("Creating organisation: {}", request.getName());
        Organisation parent = null;
        if (request.getParentOrgId() != null) {
            parent = organisationRepository.findById(request.getParentOrgId())
                    .orElseThrow(() -> new EntityNotFoundException("Parent organisation not found"));
        }

        Organisation org = Organisation.builder()
                .name(request.getName())
                .orgType(request.getOrgType())
                .parentOrg(parent)
                .primaryColor(request.getPrimaryColor())
                .secondaryColor(request.getSecondaryColor())
                .logoUrl(request.getLogoUrl())
                .status("Active")
                .build();

        return mapToResponse(organisationRepository.save(org));
    }

    @Transactional
    @SuppressWarnings("null")
    public OrganisationResponse updateOrganisation(UUID id, OrganisationUpdateRequest request) {
        log.info("Updating organisation: {}", id);
        Organisation org = organisationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        if (request.getName() != null) {
            org.setName(request.getName());
        }
        if (request.getState() != null) {
            org.setState(request.getState());
        }
        if (request.getStatus() != null) {
            org.setStatus(request.getStatus());
        }

        return mapToResponse(organisationRepository.save(org));
    }

    private OrganisationResponse mapToResponse(Organisation org) {
        return OrganisationResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .type(org.getOrgType()) // Map orgType to type
                .parentOrgId(org.getParentOrg() != null ? org.getParentOrg().getId() : null)
                .primaryColor(org.getPrimaryColor())
                .secondaryColor(org.getSecondaryColor())
                .logoUrl(org.getLogoUrl())
                .state(org.getState())
                .status(org.getStatus())
                .build();
    }
}
