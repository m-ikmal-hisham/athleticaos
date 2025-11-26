package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.repositories.OrganisationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganisationService {

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
                .build();

        return mapToResponse(organisationRepository.save(org));
    }

    private OrganisationResponse mapToResponse(Organisation org) {
        return OrganisationResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .orgType(org.getOrgType())
                .parentOrgId(org.getParentOrg() != null ? org.getParentOrg().getId() : null)
                .primaryColor(org.getPrimaryColor())
                .secondaryColor(org.getSecondaryColor())
                .logoUrl(org.getLogoUrl())
                .build();
    }
}
