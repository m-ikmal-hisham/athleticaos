package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class AccessScopeServiceImpl implements AccessScopeService {

    private final UserService userService;
    private final OrganisationPersonRepository organisationPersonRepository;

    public AccessScopeServiceImpl(@Lazy UserService userService, OrganisationPersonRepository organisationPersonRepository) {
        this.userService = userService;
        this.organisationPersonRepository = organisationPersonRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isOrganisationInScope(UUID organisationId) {
        if (organisationId == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty()) {
            return false;
        }
        return accessibleOrgIds.contains(organisationId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTeamInScope(Team team) {
        if (team == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (team.getOrganisation() == null || team.getOrganisation().getId() == null) {
            return false;
        }
        if (accessibleOrgIds.isEmpty()) {
            return false;
        }
        return accessibleOrgIds.contains(team.getOrganisation().getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isPersonInScope(UUID personId) {
        if (personId == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty()) {
            return false;
        }
        return organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, accessibleOrgIds);
    }

    @Override
    public UUID getCurrentUserId() {
        try {
            User currentUser = userService.getCurrentUser();
            return currentUser != null ? currentUser.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
