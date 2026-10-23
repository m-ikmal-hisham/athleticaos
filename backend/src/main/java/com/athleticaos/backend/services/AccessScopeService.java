package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.User;

import java.util.Set;
import java.util.UUID;

public interface AccessScopeService {

    boolean isSuperAdmin();

    Set<UUID> getAccessibleOrgIds();

    boolean isOrganisationInScope(UUID organisationId);

    boolean isTeamInScope(Team team);

    boolean isPersonInScope(UUID personId);

    boolean isPlayerInScope(Player player);

    boolean isUserInScope(User user);

    UUID getCurrentUserId();

    boolean isTournamentInScope(Tournament tournament);

    boolean isTournamentInScope(UUID tournamentId);

    boolean isUserAssignedToTournament(UUID tournamentId, UUID userId);

    boolean isUserAssignedToMatch(UUID matchId, UUID userId);

    boolean isUserAssignedToMatch(Match match, UUID userId);

    boolean isUserParticipatingInTournament(UUID tournamentId);

    boolean canReadTournament(Tournament tournament);

    boolean canReadTournament(UUID tournamentId);

    boolean canReadMatch(Match match);

    boolean canReadMatch(UUID matchId);

    boolean canWriteMatch(Match match);

    boolean canWriteMatch(UUID matchId);

    Set<UUID> getAccessibleTournamentIds();
}
