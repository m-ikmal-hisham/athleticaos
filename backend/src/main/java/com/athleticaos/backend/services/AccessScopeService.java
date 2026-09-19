package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Team;

import java.util.UUID;

public interface AccessScopeService {

    boolean isOrganisationInScope(UUID organisationId);

    boolean isTeamInScope(Team team);

    boolean isPersonInScope(UUID personId);

    UUID getCurrentUserId();
}
