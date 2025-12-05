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

    List<OrganisationResponse> getCountries();

    List<OrganisationResponse> getStates(UUID countryId);

    List<OrganisationResponse> getDivisions(UUID stateId);

    List<OrganisationResponse> getDistricts(UUID stateId);

    List<OrganisationResponse> getChildren(UUID parentId);

    Object getTree(UUID countryId);
}
