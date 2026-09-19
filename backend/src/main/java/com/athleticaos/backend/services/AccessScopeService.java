package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;

import java.util.UUID;

public interface AccessScopeService {

    boolean isOrganisationInScope(UUID organisationId);

    boolean isTeamInScope(Team team);

    boolean isPersonInScope(UUID personId);

    boolean isPlayerInScope(Player player);

    boolean isUserInScope(User user);

    UUID getCurrentUserId();
}

