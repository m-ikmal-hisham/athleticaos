package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.org.OrganisationCreateRequest;
import com.athleticaos.backend.dtos.org.OrganisationResponse;
import com.athleticaos.backend.dtos.org.OrganisationTreeNode;
import com.athleticaos.backend.dtos.org.OrganisationUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.entities.Team;

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
    private final TeamRepository teamRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
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

        String slug = generateSlug(request.getName());

        String orgState = null;
        if (parent != null) {
            if (parent.getOrgLevel() == OrganisationLevel.STATE) {
                orgState = parent.getState() != null ? parent.getState() : parent.getName();
            } else if (parent.getParentOrg() != null
                    && parent.getParentOrg().getOrgLevel() == OrganisationLevel.STATE) {
                orgState = parent.getParentOrg().getState() != null ? parent.getParentOrg().getState()
                        : parent.getParentOrg().getName();
            } else if (parent.getOrgLevel() == OrganisationLevel.DIVISION
                    && request.getOrgLevel() == OrganisationLevel.CLUB) {
                // Special case for Sarawak: If parent is Division, we might need to look up if
                // that Division has a parent
                if (parent.getParentOrg() != null && parent.getParentOrg().getOrgLevel() == OrganisationLevel.STATE) {
                    orgState = parent.getParentOrg().getState() != null ? parent.getParentOrg().getState()
                            : parent.getParentOrg().getName();
                }
            }
            // Fallback: If parent has state set, use it
            if (orgState == null && parent.getState() != null) {
                orgState = parent.getState();
            }
        }

        Organisation org = Organisation.builder()
                .name(request.getName())
                .orgType(request.getOrgType())
                .orgLevel(request.getOrgLevel() != null ? request.getOrgLevel() : OrganisationLevel.CLUB)
                .parentOrg(parent)
                .state(orgState)
                .primaryColor(request.getPrimaryColor())
                .secondaryColor(request.getSecondaryColor())
                .tertiaryColor(request.getTertiaryColor())
                .quaternaryColor(request.getQuaternaryColor())
                .logoUrl(request.getLogoUrl())
                .accentColor(request.getAccentColor())
                .coverImageUrl(request.getCoverImageUrl())
                .addressLine1(request.getAddressLine1())
                .addressLine2(request.getAddressLine2())
                .postcode(request.getPostcode())
                .city(request.getCity())
                .stateCode(request.getStateCode())
                .countryCode(request.getCountryCode())
                .slug(slug)
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
        if (request.getOrgType() != null) {
            org.setOrgType(request.getOrgType());
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
        if (request.getAccentColor() != null) {
            org.setAccentColor(request.getAccentColor());
        }
        if (request.getCoverImageUrl() != null) {
            org.setCoverImageUrl(request.getCoverImageUrl());
        }
        if (request.getAddressLine1() != null) {
            org.setAddressLine1(request.getAddressLine1());
        }
        if (request.getAddressLine2() != null) {
            org.setAddressLine2(request.getAddressLine2());
        }
        if (request.getPostcode() != null) {
            org.setPostcode(request.getPostcode());
        }
        if (request.getCity() != null) {
            org.setCity(request.getCity());
        }
        if (request.getStateCode() != null) {
            org.setStateCode(request.getStateCode());
        }
        if (request.getCountryCode() != null) {
            org.setCountryCode(request.getCountryCode());
        }

        // Handle Parent Org update and recursive state resolution
        if (request.getParentOrgId() != null) {
            Organisation newParent = organisationRepository.findById(request.getParentOrgId())
                    .orElseThrow(() -> new EntityNotFoundException("New parent organisation not found"));

            org.setParentOrg(newParent);

            // Re-calculate state based on new parent
            String orgState = null;
            if (newParent.getOrgLevel() == OrganisationLevel.STATE) {
                orgState = newParent.getState() != null ? newParent.getState() : newParent.getName();
            } else if (newParent.getParentOrg() != null
                    && newParent.getParentOrg().getOrgLevel() == OrganisationLevel.STATE) {
                orgState = newParent.getParentOrg().getState() != null ? newParent.getParentOrg().getState()
                        : newParent.getParentOrg().getName();
            } else if (newParent.getOrgLevel() == OrganisationLevel.DIVISION
                    && org.getOrgLevel() == OrganisationLevel.CLUB) {
                // Special case for Sarawak: If parent is Division, we might need to look up if
                // that Division has a parent
                if (newParent.getParentOrg() != null
                        && newParent.getParentOrg().getOrgLevel() == OrganisationLevel.STATE) {
                    orgState = newParent.getParentOrg().getState() != null ? newParent.getParentOrg().getState()
                            : newParent.getParentOrg().getName();
                }
            }

            // Fallback: If parent has state set, use it
            if (orgState == null && newParent.getState() != null) {
                orgState = newParent.getState();
            }

            if (orgState != null) {
                org.setState(orgState);
            }
        }

        if (request.getTeamIds() != null && !request.getTeamIds().isEmpty()) {
            List<Team> teams = teamRepository.findAllById(request.getTeamIds());
            teams.forEach(t -> t.setOrganisation(org));
            teamRepository.saveAll(teams);
        }

        validateHierarchy(org);

        return mapToResponse(organisationRepository.save(org));
    }

    private OrganisationResponse mapToResponse(Organisation org) {
        return OrganisationResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .slug(org.getSlug())
                .type(org.getOrgType()) // Map orgType to type
                .parentOrgId(org.getParentOrg() != null ? org.getParentOrg().getId() : null)
                .primaryColor(org.getPrimaryColor())
                .secondaryColor(org.getSecondaryColor())
                .tertiaryColor(org.getTertiaryColor())
                .quaternaryColor(org.getQuaternaryColor())
                .logoUrl(org.getLogoUrl())
                .accentColor(org.getAccentColor())
                .coverImageUrl(org.getCoverImageUrl())
                .state(org.getState())
                .addressLine1(org.getAddressLine1())
                .addressLine2(org.getAddressLine2())
                .postcode(org.getPostcode())
                .city(org.getCity())
                .stateCode(org.getStateCode())
                .countryCode(org.getCountryCode())
                .status(org.getStatus())
                .orgLevel(org.getOrgLevel())
                .parentOrganisationName(org.getParentOrg() != null ? org.getParentOrg().getName() : null)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganisationResponse> getCountries() {
        return organisationRepository.findByOrgLevel(OrganisationLevel.COUNTRY).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganisationResponse> getStates(UUID countryId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.STATE, countryId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganisationResponse> getDivisions(UUID stateId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.DIVISION, stateId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganisationResponse> getDistricts(UUID stateId) {
        return organisationRepository.findByOrgLevelAndParentOrgId(OrganisationLevel.DISTRICT, stateId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrganisationResponse> getChildren(UUID parentId) {
        return organisationRepository.findByParentOrgId(parentId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @SuppressWarnings("null")
    @Transactional(readOnly = true)
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
                    // Relaxed: Just warn or allow null parent for now if needed, but keeping strict
                    // for State-Country link seems safe?
                    // Let's keep strict for State -> Country as that is standard.
                    if (parent != null && parent.getOrgLevel() != OrganisationLevel.COUNTRY) {
                        throw new IllegalArgumentException("STATE must have a COUNTRY as parent.");
                    }
                }
            }
            case DIVISION -> {
                // Relaxed: Divisions exist in Sarawak/Sabah, parent should be State.
                if (parent != null && parent.getOrgLevel() != OrganisationLevel.STATE) {
                    throw new IllegalArgumentException("DIVISION must have a STATE as parent.");
                }
            }
            // For DISTRICT, CLUB, SCHOOL -> We RELAX the rules to allow skipping levels.
            // e.g. Club -> State, or Club -> Division, or Club -> District.
            case DISTRICT -> {
                // No strict validation on parent level
            }
            case CLUB, SCHOOL -> {
                // No strict validation on parent level
            }
        }
    }

    private String generateSlug(String name) {
        if (name == null)
            return null;
        String slug = name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-");

        // Ensure uniqueness
        if (organisationRepository.findBySlug(slug).isPresent()) {
            int suffix = 1;
            while (organisationRepository.findBySlug(slug + "-" + suffix).isPresent()) {
                suffix++;
            }
            slug = slug + "-" + suffix;
        }
        return slug;
    }
}
