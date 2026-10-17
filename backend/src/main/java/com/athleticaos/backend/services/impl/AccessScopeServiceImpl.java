package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.MatchOfficialRepository;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TournamentOfficialRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class AccessScopeServiceImpl implements AccessScopeService {

    private final UserService userService;
    private final OrganisationPersonRepository organisationPersonRepository;
    private final PlayerTeamRepository playerTeamRepository;
    private final TournamentRepository tournamentRepository;
    private final TournamentOfficialRepository tournamentOfficialRepository;
    private final MatchOfficialRepository matchOfficialRepository;
    private final TournamentTeamRepository tournamentTeamRepository;
    private final MatchRepository matchRepository;

    public AccessScopeServiceImpl(@Lazy UserService userService,
                                  OrganisationPersonRepository organisationPersonRepository,
                                  PlayerTeamRepository playerTeamRepository,
                                  TournamentRepository tournamentRepository,
                                  TournamentOfficialRepository tournamentOfficialRepository,
                                  MatchOfficialRepository matchOfficialRepository,
                                  TournamentTeamRepository tournamentTeamRepository,
                                  MatchRepository matchRepository) {
        this.userService = userService;
        this.organisationPersonRepository = organisationPersonRepository;
        this.playerTeamRepository = playerTeamRepository;
        this.tournamentRepository = tournamentRepository;
        this.tournamentOfficialRepository = tournamentOfficialRepository;
        this.matchOfficialRepository = matchOfficialRepository;
        this.tournamentTeamRepository = tournamentTeamRepository;
        this.matchRepository = matchRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isSuperAdmin() {
        return userService.getAccessibleOrgIdsForCurrentUser() == null;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> getAccessibleOrgIds() {
        return userService.getAccessibleOrgIdsForCurrentUser();
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
    @Transactional(readOnly = true)
    public boolean isPlayerInScope(Player player) {
        if (player == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty()) {
            return false;
        }
        UUID personId = player.getPerson() != null ? player.getPerson().getId() : null;
        if (personId != null && organisationPersonRepository.existsByPersonIdAndOrganisationIdIn(personId, accessibleOrgIds)) {
            return true;
        }
        return playerTeamRepository.existsActiveByPlayerIdAndOrganisationIdIn(player.getId(), accessibleOrgIds);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserInScope(User user) {
        if (user == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty() || user.getOrganisation() == null || user.getOrganisation().getId() == null) {
            return false;
        }
        return accessibleOrgIds.contains(user.getOrganisation().getId());
    }

    @Override
    public UUID getCurrentUserId() {
        User currentUser = userService.getCurrentUser();
        return currentUser != null ? currentUser.getId() : null;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTournamentInScope(Tournament tournament) {
        if (tournament == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty() || tournament.getOrganiserOrg() == null || tournament.getOrganiserOrg().getId() == null) {
            return false;
        }
        return accessibleOrgIds.contains(tournament.getOrganiserOrg().getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTournamentInScope(UUID tournamentId) {
        if (tournamentId == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        return tournamentRepository.findById(tournamentId)
                .map(this::isTournamentInScope)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserAssignedToTournament(UUID tournamentId, UUID userId) {
        if (tournamentId == null || userId == null) {
            return false;
        }
        return tournamentOfficialRepository.isUserAssignedToTournament(tournamentId, userId)
                || matchOfficialRepository.isUserAssignedToTournamentMatches(tournamentId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserAssignedToMatch(UUID matchId, UUID userId) {
        if (matchId == null || userId == null) {
            return false;
        }
        if (matchOfficialRepository.isUserAssignedToMatch(matchId, userId)) {
            return true;
        }
        return matchRepository.findById(matchId)
                .map(m -> isUserAssignedToMatch(m, userId))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserAssignedToMatch(Match match, UUID userId) {
        if (match == null || userId == null) {
            return false;
        }
        if (match.getId() != null && matchOfficialRepository.isUserAssignedToMatch(match.getId(), userId)) {
            return true;
        }
        Tournament tournament = match.getTournament();
        if (tournament != null && tournament.getId() != null) {
            return tournamentOfficialRepository.isUserAssignedToTournament(tournament.getId(), userId);
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserParticipatingInTournament(UUID tournamentId) {
        if (tournamentId == null) {
            return false;
        }
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return true;
        }
        if (accessibleOrgIds.isEmpty()) {
            return false;
        }
        return tournamentTeamRepository.existsByTournamentIdAndTeamOrganisationIdIn(tournamentId, accessibleOrgIds);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canReadTournament(Tournament tournament) {
        if (tournament == null) {
            return false;
        }
        if (isTournamentInScope(tournament)) {
            return true;
        }
        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null && isUserAssignedToTournament(tournament.getId(), currentUserId)) {
            return true;
        }
        return isUserParticipatingInTournament(tournament.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canReadTournament(UUID tournamentId) {
        if (tournamentId == null) {
            return false;
        }
        return tournamentRepository.findById(tournamentId)
                .map(this::canReadTournament)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canReadMatch(Match match) {
        if (match == null) {
            return false;
        }
        if (match.getTournament() != null && isTournamentInScope(match.getTournament())) {
            return true;
        }
        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            if (isUserAssignedToMatch(match.getId(), currentUserId)) {
                return true;
            }
            if (match.getTournament() != null && isUserAssignedToTournament(match.getTournament().getId(), currentUserId)) {
                return true;
            }
        }
        if (isTeamInScope(match.getHomeTeam()) || isTeamInScope(match.getAwayTeam())) {
            return true;
        }
        if (match.getTournament() != null && isUserParticipatingInTournament(match.getTournament().getId())) {
            return true;
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canReadMatch(UUID matchId) {
        if (matchId == null) {
            return false;
        }
        return matchRepository.findById(matchId)
                .map(this::canReadMatch)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canWriteMatch(Match match) {
        if (match == null) {
            return false;
        }
        if (match.getTournament() != null && isTournamentInScope(match.getTournament())) {
            return true;
        }
        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            if (isUserAssignedToMatch(match, currentUserId)) {
                return true;
            }
        }
        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canWriteMatch(UUID matchId) {
        if (matchId == null) {
            return false;
        }
        return matchRepository.findById(matchId)
                .map(this::canWriteMatch)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<UUID> getAccessibleTournamentIds() {
        Set<UUID> accessibleOrgIds = userService.getAccessibleOrgIdsForCurrentUser();
        if (accessibleOrgIds == null) {
            return null;
        }
        Set<UUID> ids = new HashSet<>();
        if (!accessibleOrgIds.isEmpty()) {
            ids.addAll(tournamentRepository.findIdsByOrganiserOrg_IdIn(accessibleOrgIds));
            ids.addAll(tournamentTeamRepository.findTournamentIdsByTeamOrganisationIdIn(accessibleOrgIds));
        }
        UUID currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            ids.addAll(tournamentOfficialRepository.findTournamentIdsByAssignedUser(currentUserId));
            ids.addAll(matchOfficialRepository.findTournamentIdsByAssignedMatchOfficialUser(currentUserId));
        }
        return ids;
    }
}
