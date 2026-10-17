package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.*;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.EligibilityService;
import com.athleticaos.backend.services.PlayerSuspensionService;
import com.athleticaos.backend.services.TournamentRosterService;
import jakarta.persistence.EntityNotFoundException;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
@RequiredArgsConstructor
@Slf4j
public class TournamentRosterServiceImpl implements TournamentRosterService {

        private final TournamentTeamRepository tournamentTeamRepository;
        private final TournamentPlayerRepository tournamentPlayerRepository;
        private final TournamentRepository tournamentRepository;
        private final TeamRepository teamRepository;
        private final PlayerRepository playerRepository;
        private final MatchRepository matchRepository;
        private final PlayerTeamRepository playerTeamRepository;
        private final EligibilityService eligibilityService;
        private final PlayerSuspensionService suspensionService;
        private final TournamentStaffRepository tournamentStaffRepository;
        private final StaffRoleRepository staffRoleRepository;
        private final PersonRepository personRepository;
        private final AccessScopeService accessScopeService;

        @Override
        @Transactional

        public List<TournamentPlayerDTO> addPlayersToRoster(@NonNull UUID tournamentId, @NonNull UUID teamId,
                        @NonNull List<UUID> playerIds) {
                return addPlayersToRoster(tournamentId, teamId, playerIds, java.util.Collections.emptyMap());
        }

        @Override
        @Transactional
        public List<TournamentPlayerDTO> addPlayersToRoster(@NonNull UUID tournamentId, @NonNull UUID teamId,
                        @NonNull List<UUID> playerIds, java.util.Map<UUID, Integer> jerseyNumbers) {
                final java.util.Map<UUID, Integer> numbers = jerseyNumbers != null ? jerseyNumbers
                                : java.util.Collections.emptyMap();
                log.info("Adding {} players to roster for tournament {} team {}", playerIds.size(), tournamentId,
                                teamId);

                Tournament tournament = tournamentRepository.findById(tournamentId)
                                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));

                Team team = teamRepository.findById(teamId)
                                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(tournament);
                boolean inTeamScope = accessScopeService.isTeamInScope(team);

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for roster add outside accessible scope: userId={}, tournamentId={}, teamId={}",
                                        currentUserId, tournamentId, teamId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                // If access comes only from isTeamInScope, validate every player is in scope and belongs to this team (C5)
                if (!inTournamentScope && inTeamScope) {
                        for (UUID pId : playerIds) {
                                Player player = playerRepository.findById(pId)
                                                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + pId));
                                if (!accessScopeService.isPlayerInScope(player) || !playerTeamRepository.existsByPlayerIdAndTeamId(pId, teamId)) {
                                        UUID currentUserId = accessScopeService.getCurrentUserId();
                                        log.warn("Access denied for player add outside team scope: userId={}, playerId={}, teamId={}",
                                                        currentUserId, pId, teamId);
                                        throw new EntityNotFoundException("Player not found: " + pId);
                                }
                        }
                }

                // Get TournamentTeam to identify Category
                TournamentTeam tournamentTeam = tournamentTeamRepository
                                .findByTournamentIdAndTeamId(tournamentId, teamId)
                                .orElseThrow(() -> new IllegalArgumentException(
                                                "Team is not registered in this tournament"));

                List<TournamentPlayerDTO> addedPlayers = new ArrayList<>();

                for (UUID playerId : playerIds) {
                        Player player = playerRepository.findById(java.util.Objects.requireNonNull(playerId))
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Player not found: " + playerId));

                        if (Boolean.TRUE.equals(player.getDeleted())) {
                                throw new IllegalArgumentException("Cannot assign a deleted player: " + playerId);
                        }

                        // Check if already in roster
                        var existing = tournamentPlayerRepository.findByTournamentIdAndTeamIdAndPlayerId(
                                        tournamentId, teamId, playerId);

                        if (existing.isPresent()) {
                                TournamentPlayer tp = existing.get();
                                if (numbers.get(playerId) != null) {
                                        tp.setTournamentJerseyNumber(numbers.get(playerId));
                                        tournamentPlayerRepository.save(tp);
                                }
                                if (!tp.isActive()) {
                                        // Reactivate
                                        tp.setActive(true);
                                        tournamentPlayerRepository.save(tp);
                                        log.info("Reactivated player {} in roster", playerId);
                                } else {
                                        log.info("Player {} already in active roster", playerId);
                                }
                                addedPlayers.add(toDTO(tp));
                                continue;
                        }

                        // Check eligibility with Category context
                        EligibilityResult eligibility = eligibilityService.checkPlayerEligibility(tournament,
                                        tournamentTeam.getCategory(), player);

                        // Create roster entry
                        TournamentPlayer tournamentPlayer = TournamentPlayer.builder()
                                        .tournament(tournament)
                                        .team(team)
                                        .player(player)
                                        .isActive(true)
                                        .isEligible(eligibility.isEligible())
                                        .eligibilityNote(eligibility.getReason())
                                        .tournamentJerseyNumber(numbers.get(playerId))
                                        .build();

                        tournamentPlayerRepository.save(java.util.Objects.requireNonNull(tournamentPlayer));
                        addedPlayers.add(toDTO(tournamentPlayer));
                        log.info("Added player {} to roster with eligibility: {}", playerId, eligibility.isEligible());
                }

                return addedPlayers;
        }

        @Override
        @Transactional

        public void removePlayerFromRoster(@NonNull UUID tournamentPlayerId) {
                log.info("Removing player from roster: {}", tournamentPlayerId);

                TournamentPlayer tournamentPlayer = tournamentPlayerRepository.findById(tournamentPlayerId)
                                .orElseThrow(() -> new EntityNotFoundException("Tournament player not found"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(tournamentPlayer.getTournament());
                boolean inTeamScope = accessScopeService.isTeamInScope(tournamentPlayer.getTeam());

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for player remove outside accessible scope: userId={}, tournamentPlayerId={}",
                                        currentUserId, tournamentPlayerId);
                        throw new EntityNotFoundException("Tournament player not found");
                }

                tournamentPlayer.setActive(false);
                tournamentPlayerRepository.save(tournamentPlayer);
                log.info("Successfully removed player from roster");
        }

        @Override
        @Transactional(readOnly = true)
        public List<TournamentPlayerDTO> getRoster(UUID tournamentId, UUID teamId) {
                log.info("Getting roster for tournament {} team {}", tournamentId, teamId);

                if (!accessScopeService.canReadTournament(tournamentId)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for roster read outside accessible scope: userId={}, tournamentId={}",
                                        currentUserId, tournamentId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                List<TournamentPlayer> roster = tournamentPlayerRepository.findByTournamentIdAndTeamIdAndIsActiveTrue(
                                tournamentId, teamId);

                return roster.stream()
                                .map(this::toDTO)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public List<TournamentStaffDTO> getTournamentStaff(UUID tournamentId, UUID teamId) {
                log.info("Getting staff roster for tournament {} team {}", tournamentId, teamId);

                if (!accessScopeService.canReadTournament(tournamentId)) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for tournament staff read outside accessible scope: userId={}, tournamentId={}",
                                        currentUserId, tournamentId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                TournamentTeam tournamentTeam = tournamentTeamRepository
                                .findByTournamentIdAndTeamId(tournamentId, teamId)
                                .orElseThrow(() -> new EntityNotFoundException("Team is not registered in this tournament"));
                
                return tournamentStaffRepository.findByTournamentTeamIdAndIsActiveTrue(tournamentTeam.getId()).stream()
                                .map(this::toStaffDTO)
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional
        public TournamentStaffDTO addStaffToRoster(UUID tournamentId, AddTournamentStaffRequest request) {
                log.info("Adding staff to roster for tournament {} team {}", tournamentId, request.getTeamId());
                Tournament tournament = tournamentRepository.findById(tournamentId)
                                .orElseThrow(() -> new EntityNotFoundException("Tournament not found"));
                TournamentTeam tournamentTeam = tournamentTeamRepository
                                .findByTournamentIdAndTeamId(tournamentId, request.getTeamId())
                                .orElseThrow(() -> new EntityNotFoundException("Team is not registered in this tournament"));
                Person person = personRepository.findById(request.getPersonId())
                                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
                StaffRole role = staffRoleRepository.findById(request.getStaffRoleId())
                                .orElseThrow(() -> new EntityNotFoundException("Staff Role not found"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(tournament);
                boolean inTeamScope = accessScopeService.isTeamInScope(tournamentTeam.getTeam());

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for staff add outside accessible scope: userId={}, tournamentId={}",
                                        currentUserId, tournamentId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                if (!inTournamentScope && inTeamScope) {
                        if (!accessScopeService.isPersonInScope(person.getId())) {
                                UUID currentUserId = accessScopeService.getCurrentUserId();
                                log.warn("Access denied for staff person outside team scope: userId={}, personId={}",
                                                currentUserId, person.getId());
                                throw new EntityNotFoundException("Person not found: " + person.getId());
                        }
                }
                
                var existing = tournamentStaffRepository.findByTournamentTeamIdAndPersonIdAndStaffRoleId(
                                tournamentTeam.getId(), person.getId(), role.getId());
                
                if (existing.isPresent()) {
                        TournamentStaff ts = existing.get();
                        if (!ts.isActive()) {
                                ts.setActive(true);
                                ts = tournamentStaffRepository.save(ts);
                        }
                        return toStaffDTO(ts);
                }

                TournamentStaff ts = TournamentStaff.builder()
                                .tournament(tournament)
                                .tournamentTeam(tournamentTeam)
                                .person(person)
                                .staffRole(role)
                                .isActive(true)
                                .build();
                
                ts = tournamentStaffRepository.save(ts);
                return toStaffDTO(ts);
        }

        @Override
        @Transactional
        public void removeStaffFromRoster(UUID tournamentStaffId) {
                log.info("Removing staff from roster: {}", tournamentStaffId);
                TournamentStaff ts = tournamentStaffRepository.findById(tournamentStaffId)
                                .orElseThrow(() -> new EntityNotFoundException("Tournament staff not found"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(ts.getTournament());
                boolean inTeamScope = accessScopeService.isTeamInScope(ts.getTournamentTeam().getTeam());

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for staff remove outside accessible scope: userId={}, tournamentStaffId={}",
                                        currentUserId, tournamentStaffId);
                        throw new EntityNotFoundException("Tournament staff not found");
                }

                ts.setActive(false);
                tournamentStaffRepository.save(ts);
                log.info("Successfully removed staff from roster");
        }

        @Override
        @Transactional(readOnly = true)

        public LineupHintsDTO getLineupHints(@NonNull UUID matchId) {
                log.info("Getting lineup hints for match {}", matchId);

                Match match = matchRepository.findById(matchId)
                                .orElseThrow(() -> new IllegalArgumentException("Match not found"));

                Tournament tournament = match.getTournament();
                Team homeTeam = match.getHomeTeam();
                Team awayTeam = match.getAwayTeam();

                // Get rosters for both teams (Home)
                List<LineupPlayerDTO> homePlayers = new ArrayList<>();
                if (homeTeam != null) {
                        List<TournamentPlayer> homeRoster = tournamentPlayerRepository
                                        .findByTournamentIdAndTeamIdAndIsActiveTrue(
                                                        tournament.getId(), homeTeam.getId());

                        homePlayers = homeRoster.stream()
                                        .filter(com.athleticaos.backend.utils.StreamUtils
                                                        .distinctByKey(tp -> tp.getPlayer().getId()))
                                        .map(tp -> toLineupPlayerDTO(tp, tournament.getId()))
                                        .collect(Collectors.toList());
                }

                // Get rosters for both teams (Away)
                List<LineupPlayerDTO> awayPlayers = new ArrayList<>();
                if (awayTeam != null) {
                        List<TournamentPlayer> awayRoster = tournamentPlayerRepository
                                        .findByTournamentIdAndTeamIdAndIsActiveTrue(
                                                        tournament.getId(), awayTeam.getId());

                        awayPlayers = awayRoster.stream()
                                        .filter(com.athleticaos.backend.utils.StreamUtils
                                                        .distinctByKey(tp -> tp.getPlayer().getId()))
                                        .map(tp -> toLineupPlayerDTO(tp, tournament.getId()))
                                        .collect(Collectors.toList());
                }

                return LineupHintsDTO.builder()
                                .homeTeamPlayers(homePlayers)
                                .awayTeamPlayers(awayPlayers)
                                .build();
        }

        private TournamentPlayerDTO toDTO(TournamentPlayer tp) {
                Player player = tp.getPlayer();
                Person person = player.getPerson();

                // Get jersey number with priority: tournament > team
                Integer displayNumber = tp.getTournamentJerseyNumber();
                var playerTeam = playerTeamRepository.findByPlayerIdAndTeamId(player.getId(),
                                tp.getTeam().getId());
                if (displayNumber == null && playerTeam.isPresent()) {
                        displayNumber = playerTeam.get().getJerseyNumber();
                }

                // Check for active suspensions
                boolean hasSuspension = suspensionService.hasActiveSuspension(tp.getTournament().getId(),
                                player.getId());
                String suspensionReason = null;
                Integer suspensionMatches = null;

                if (hasSuspension) {
                        List<PlayerSuspensionDTO> suspensions = suspensionService.getPlayerActiveSuspensions(
                                        tp.getTournament().getId(), player.getId());
                        if (!suspensions.isEmpty()) {
                                PlayerSuspensionDTO suspension = suspensions.get(0);
                                suspensionReason = suspension.getReason();
                                suspensionMatches = suspension.getMatchesRemaining();
                        }
                }

                return TournamentPlayerDTO.builder()
                                .id(tp.getId())
                                .playerId(player.getId())
                                .playerName(person.getFirstName() + " " + person.getLastName())
                                .playerNumber(displayNumber != null ? displayNumber.toString() : null)
                                // Both layers are returned so the roster can show whether a number is
                                // inherited from the club or set for this tournament. Without that an
                                // organiser cannot tell why a number is what it is.
                                .tournamentJerseyNumber(tp.getTournamentJerseyNumber())
                                .teamJerseyNumber(playerTeam.map(pt -> pt.getJerseyNumber()).orElse(null))
                                .organisationName(tp.getTeam().getOrganisation().getName())
                                .isEligible(tp.isEligible())
                                .eligibilityNote(tp.getEligibilityNote())
                                .hasActiveSuspension(hasSuspension)
                                .suspensionReason(suspensionReason)
                                .suspensionMatchesRemaining(suspensionMatches)
                                .position(tp.getPosition() != null ? tp.getPosition() : (playerTeam.isPresent() ? playerTeam.get().getPosition() : null))
                                .build();
        }

        private TournamentStaffDTO toStaffDTO(TournamentStaff ts) {
                return TournamentStaffDTO.builder()
                                .id(ts.getId())
                                .personId(ts.getPerson().getId())
                                .firstName(ts.getPerson().getFirstName())
                                .lastName(ts.getPerson().getLastName())
                                .staffRoleId(ts.getStaffRole().getId())
                                .staffRoleName(ts.getStaffRole().getName())
                                .staffRoleDescription(ts.getStaffRole().getDescription())
                                .isActive(ts.isActive())
                                .build();
        }

        private LineupPlayerDTO toLineupPlayerDTO(TournamentPlayer tp, UUID tournamentId) {
                Player player = tp.getPlayer();
                Person person = player.getPerson();

                // Get jersey number and position
                // Priority: Tournament Jersey > Team Jersey
                Integer jerseyNumber = tp.getTournamentJerseyNumber();
                String position = null;

                var playerTeam = playerTeamRepository.findByPlayerIdAndTeamId(player.getId(), tp.getTeam().getId());
                if (playerTeam.isPresent()) {
                        if (jerseyNumber == null) {
                                jerseyNumber = playerTeam.get().getJerseyNumber();
                        }
                }
                position = tp.getPosition() != null ? tp.getPosition() : (playerTeam.isPresent() ? playerTeam.get().getPosition() : null);

                // Check for active suspensions
                boolean hasSuspension = suspensionService.hasActiveSuspension(tournamentId, player.getId());
                String suspensionReason = null;
                Integer suspensionMatches = null;

                if (hasSuspension) {
                        List<PlayerSuspensionDTO> suspensions = suspensionService.getPlayerActiveSuspensions(
                                        tournamentId,
                                        player.getId());
                        if (!suspensions.isEmpty()) {
                                PlayerSuspensionDTO suspension = suspensions.get(0);
                                suspensionReason = suspension.getReason();
                                suspensionMatches = suspension.getMatchesRemaining();
                        }
                }

                return LineupPlayerDTO.builder()
                                .playerId(player.getId())
                                .playerName(person.getFirstName() + " " + person.getLastName())
                                .playerNumber(jerseyNumber != null ? jerseyNumber.toString() : null)
                                .position(position)
                                .isEligible(tp.isEligible())
                                .eligibilityNote(tp.getEligibilityNote())
                                .isSuspended(hasSuspension)
                                .suspensionReason(suspensionReason)
                                .suspensionMatchesRemaining(suspensionMatches)
                                .build();
        }

        @Override
        @Transactional

        public TournamentPlayerDTO updateTournamentJerseyNumber(
                        @NonNull UUID tournamentId, @NonNull UUID teamId, @NonNull UUID playerId,
                        Integer jerseyNumber) {

                log.info("Updating tournament jersey number for player {} in tournament {} team {} to {}",
                                playerId, tournamentId, teamId, jerseyNumber);

                TournamentPlayer tp = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndPlayerId(tournamentId, teamId, playerId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Player not found in tournament roster"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(tp.getTournament());
                boolean inTeamScope = accessScopeService.isTeamInScope(tp.getTeam());

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for jersey number update outside accessible scope: userId={}, tournamentId={}, teamId={}",
                                        currentUserId, tournamentId, teamId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                tp.setTournamentJerseyNumber(jerseyNumber);
                tournamentPlayerRepository.save(tp);

                log.info("Successfully updated tournament jersey number");
                return toDTO(tp);
        }

        @Override
        @Transactional
        public TournamentPlayerDTO updateTournamentPosition(
                        @NonNull UUID tournamentId, @NonNull UUID teamId, @NonNull UUID playerId,
                        String position) {

                log.info("Updating tournament position for player {} in tournament {} team {} to {}",
                                playerId, tournamentId, teamId, position);

                TournamentPlayer tp = tournamentPlayerRepository
                                .findByTournamentIdAndTeamIdAndPlayerId(tournamentId, teamId, playerId)
                                .orElseThrow(() -> new EntityNotFoundException(
                                                "Player not found in tournament roster"));

                boolean inTournamentScope = accessScopeService.isTournamentInScope(tp.getTournament());
                boolean inTeamScope = accessScopeService.isTeamInScope(tp.getTeam());

                if (!inTournamentScope && !inTeamScope) {
                        UUID currentUserId = accessScopeService.getCurrentUserId();
                        log.warn("Access denied for position update outside accessible scope: userId={}, tournamentId={}, teamId={}",
                                        currentUserId, tournamentId, teamId);
                        throw new EntityNotFoundException("Tournament not found");
                }

                tp.setPosition(position);
                tournamentPlayerRepository.save(tp);

                log.info("Successfully updated tournament position");
                return toDTO(tp);
        }
}
