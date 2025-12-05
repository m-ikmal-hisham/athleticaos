package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationTreeNode;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;

import com.athleticaos.backend.services.OrganisationService;
import com.athleticaos.backend.services.UserService;
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
    private final UserService userService;

    public List<OrganisationResponse> getAllOrganisations() {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();

        List<Organisation> orgs;
        if (accessibleIds == null) {
            orgs = organisationRepository.findAll();
        } else if (accessibleIds.isEmpty()) {
            orgs = java.util.Collections.emptyList();
        } else {
            orgs = organisationRepository.findAllById(accessibleIds);
        }

        return orgs.stream()
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
                .orgLevel(request.getOrgLevel() != null ? request.getOrgLevel() : OrganisationLevel.CLUB)
                .parentOrg(parent)
                .primaryColor(request.getPrimaryColor())
                .secondaryColor(request.getSecondaryColor())
                .tertiaryColor(request.getTertiaryColor())
                .quaternaryColor(request.getQuaternaryColor())
                .logoUrl(request.getLogoUrl())
                .status("Active")
                .build();

        validateHierarchy(org);

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
        if (request.getOrgLevel() != null) {
            org.setOrgLevel(request.getOrgLevel());
        }
        if (request.getPrimaryColor() != null) {
            org.setPrimaryColor(request.getPrimaryColor());
        }
        if (request.getSecondaryColor() != null) {
            org.setSecondaryColor(request.getSecondaryColor());
        }
        if (request.getTertiaryColor() != null) {
            org.setTertiaryColor(request.getTertiaryColor());
        }
        if (request.getQuaternaryColor() != null) {
            org.setQuaternaryColor(request.getQuaternaryColor());
        }
        if (request.getLogoUrl() != null) {
            org.setLogoUrl(request.getLogoUrl());
        }

        validateHierarchy(org);

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
                .tertiaryColor(org.getTertiaryColor())
                .quaternaryColor(org.getQuaternaryColor())
                .logoUrl(org.getLogoUrl())
                .state(org.getState())
                .status(org.getStatus())
                .orgLevel(org.getOrgLevel())
                .build();
    }

    @Override
    public List<OrganisationResponse> getCountries() {
        return organisationRepository.findByOrgLevel(OrganisationLevel.COUNTRY).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrganisationResponse> getStates(UUID countryId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.STATE, countryId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrganisationResponse> getDivisions(UUID stateId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.DIVISION, stateId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrganisationResponse> getDistricts(UUID stateId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.DISTRICT, stateId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrganisationResponse> getChildren(UUID parentId) {
        return organisationRepository.findByParentOrgId(parentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Object getTree(UUID countryId) {
        Organisation country = organisationRepository.findById(countryId)
                .orElseThrow(() -> new EntityNotFoundException("Country not found"));

        if (country.getOrgLevel() != OrganisationLevel.COUNTRY) {
            throw new IllegalArgumentException("Requested organisation is not a COUNTRY");
        }

        // Fetch all organisations to build tree in memory (avoid N+1)
        List<Organisation> allOrgs = organisationRepository.findAll();

        return buildTree(country, allOrgs);
    }

    private OrganisationTreeNode buildTree(Organisation root, List<Organisation> allOrgs) {
        List<OrganisationTreeNode> children = allOrgs.stream()
                .filter(org -> org.getParentOrg() != null && org.getParentOrg().getId().equals(root.getId()))
                .map(child -> buildTree(child, allOrgs))
                .collect(Collectors.toList());

        return OrganisationTreeNode.builder()
                .id(root.getId())
                .name(root.getName())
                .orgLevel(root.getOrgLevel())
                .children(children.isEmpty() ? null : children)
                .build();
    }

    private void validateHierarchy(Organisation organisation) {
        OrganisationLevel level = organisation.getOrgLevel();
        Organisation parent = organisation.getParentOrg();

        if (level == null)
            return;

        switch (level) {
            case COUNTRY -> {
                if (parent != null) {
                    throw new IllegalArgumentException("COUNTRY may not have a parent organisation.");
                }
            }
            case STATE -> {
                if (parent == null || parent.getOrgLevel() != OrganisationLevel.COUNTRY) {
                    throw new IllegalArgumentException("STATE must have a COUNTRY as parent.");
                }
            }
            case DIVISION -> {
                if (parent == null || parent.getOrgLevel() != OrganisationLevel.STATE) {
                    throw new IllegalArgumentException("DIVISION must have a STATE as parent.");
                }
            }
            case DISTRICT -> {
                if (parent == null ||
                        !(parent.getOrgLevel() == OrganisationLevel.STATE
                                || parent.getOrgLevel() == OrganisationLevel.DIVISION)) {
                    throw new IllegalArgumentException("DISTRICT must have a STATE or DIVISION as parent.");
                }
            }
            case CLUB, SCHOOL -> {
                if (parent == null ||
                        !(parent.getOrgLevel() == OrganisationLevel.DISTRICT
                                || parent.getOrgLevel() == OrganisationLevel.DIVISION)) {
                    throw new IllegalArgumentException(level + " must have a DISTRICT or DIVISION as parent.");
                }
            }
        }
    }
}
