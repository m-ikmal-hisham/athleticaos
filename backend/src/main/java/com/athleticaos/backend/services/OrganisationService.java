package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface OrganisationService {
    List<OrganisationResponse> getAllOrganisations();

    OrganisationResponse getOrganisationById(UUID id);

    OrganisationResponse createOrganisation(OrganisationCreateRequest request);

    OrganisationResponse updateOrganisation(UUID id, OrganisationUpdateRequest request);
}
