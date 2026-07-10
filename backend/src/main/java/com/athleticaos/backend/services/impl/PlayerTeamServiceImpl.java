package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.playerteam.AssignPlayerRequest;
import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.MatchLineupRepository;
import com.athleticaos.backend.repositories.MatchEventRepository;
import com.athleticaos.backend.services.PlayerTeamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerTeamServiceImpl implements PlayerTeamService {

        private final PlayerTeamRepository playerTeamRepository;
        private final PlayerRepository playerRepository;
        private final TeamRepository teamRepository;
        private final MatchLineupRepository matchLineupRepository;
        private final MatchEventRepository matchEventRepository;

        @Override
        @Transactional
        @SuppressWarnings("null")
        public void assignPlayerToTeam(AssignPlayerRequest request) {
                log.info("Assigning player {} to team {}", request.getPlayerId(), request.getTeamId());

                Player player = playerRepository.findById(request.getPlayerId())
                                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

                if (Boolean.TRUE.equals(player.getDeleted())) {
                        throw new IllegalArgumentException("Cannot assign a deleted player");
                }

                Team team = teamRepository.findById(request.getTeamId())
                                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

                // Enforce National Team Filter
                if (com.athleticaos.backend.enums.OrganisationLevel.COUNTRY.equals(team.getOrganisation().getOrgLevel())) {
                        if (!"ACTIVE".equals(player.getPerson().getNationalPlayerStatus())) {
                                throw new IllegalStateException("Only active national players can be assigned to a national team.");
                        }
                }

                // Check if assignment already exists
                playerTeamRepository.findByPlayerIdAndTeamId(request.getPlayerId(), request.getTeamId())
                                .ifPresentOrElse(
                                                existing -> {
                                                        if (existing.getIsActive()) {
                                                                throw new IllegalStateException(
                                                                                "Player is already assigned to this team");
                                                        }
                                                        // Reactivate existing assignment
                                                        existing.setIsActive(true);
                                                        existing.setJerseyNumber(request.getJerseyNumber());
                                                        existing.setPosition(request.getPosition());
                                                        existing.setJoinedDate(request.getJoinedDate() != null
                                                                        ? request.getJoinedDate()
                                                                        : LocalDate.now());
                                                        playerTeamRepository.save(existing);
                                                        log.info("Reactivated assignment for player {} to team {}",
                                                                        request.getPlayerId(), request.getTeamId());
                                                },
                                                () -> {
                                                        // Create new assignment
                                                        PlayerTeam playerTeam = PlayerTeam.builder()
                                                                        .player(player)
                                                                        .team(team)
                                                                        .jerseyNumber(request.getJerseyNumber())
                                                                        .position(request.getPosition())
                                                                        .joinedDate(request.getJoinedDate() != null
                                                                                        ? request.getJoinedDate()
                                                                                        : LocalDate.now())
                                                                        .isActive(true)
                                                                        .build();
                                                        playerTeamRepository.save(playerTeam);
                                                        log.info("Created new assignment for player {} to team {}",
                                                                        request.getPlayerId(), request.getTeamId());
                                                });

                log.info("Successfully assigned player {} to team {}", request.getPlayerId(), request.getTeamId());
        }

        @Override
        @Transactional
        public void removePlayerFromTeam(UUID playerId, UUID teamId) {
                log.info("Removing player {} from team {}", playerId, teamId);

                PlayerTeam playerTeam = playerTeamRepository.findByPlayerIdAndTeamId(playerId, teamId)
                                .orElseThrow(() -> new IllegalArgumentException("Player-team assignment not found"));

                playerTeam.setIsActive(false);
                playerTeamRepository.save(playerTeam);
                log.info("Successfully removed player {} from team {}", playerId, teamId);
        }

        @Override
        @Transactional
        public void removePlayersFromTeam(List<UUID> playerIds, UUID teamId) {
                log.info("Bulk removing players {} from team {}", playerIds, teamId);
                if (playerIds == null || playerIds.isEmpty()) {
                        return;
                }
                for (UUID playerId : playerIds) {
                        try {
                                removePlayerFromTeam(playerId, teamId);
                        } catch (Exception e) {
                                log.error("Failed to remove player {} from team {}", playerId, teamId, e);
                        }
                }
        }

        @Override
        @Transactional(readOnly = true)
        public List<PlayerInTeamDTO> getTeamRoster(UUID teamId, UUID tournamentId) {
                log.info("Fetching roster for team {} with tournamentId {}", teamId, tournamentId);

                List<PlayerTeam> playerTeams = playerTeamRepository.findActiveRosterByTeamId(teamId);

                // Fetch appearance stats and event stats for all team players in bulk
                Map<UUID, Integer> appearancesMap = new HashMap<>();
                try {
                    List<Object[]> appearances = tournamentId == null 
                        ? matchLineupRepository.countAppearancesByTeamId(teamId)
                        : matchLineupRepository.countAppearancesByTeamIdAndTournamentId(teamId, tournamentId);
                    for (Object[] row : appearances) {
                        if (row[0] != null && row[1] != null) {
                            appearancesMap.put((UUID) row[0], ((Long) row[1]).intValue());
                        }
                    }
                } catch (Exception e) {
                    log.error("Error fetching roster appearances stats", e);
                }

                Map<UUID, Map<com.athleticaos.backend.enums.MatchEventType, Integer>> eventsMap = new HashMap<>();
                try {
                    List<Object[]> eventCounts = tournamentId == null
                        ? matchEventRepository.countEventsByTeamIdAndEventType(teamId)
                        : matchEventRepository.countEventsByTeamIdAndEventTypeAndTournamentId(teamId, tournamentId);
                    for (Object[] row : eventCounts) {
                        if (row[0] != null && row[1] != null && row[2] != null) {
                            UUID playerId = (UUID) row[0];
                            com.athleticaos.backend.enums.MatchEventType type = (com.athleticaos.backend.enums.MatchEventType) row[1];
                            int count = ((Long) row[2]).intValue();
                            eventsMap.computeIfAbsent(playerId, k -> new HashMap<>()).put(type, count);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error fetching roster event stats", e);
                }

                return playerTeams.stream()
                                .filter(com.athleticaos.backend.utils.StreamUtils
                                                .distinctByKey(pt -> pt.getPlayer().getId()))
                                .map(pt -> {
                                                UUID playerId = pt.getPlayer().getId();
                                                int appearances = appearancesMap.getOrDefault(playerId, 0);
                                                Map<com.athleticaos.backend.enums.MatchEventType, Integer> pEvents = eventsMap.getOrDefault(playerId, Collections.emptyMap());

                                                return PlayerInTeamDTO.builder()
                                                                .playerId(playerId)
                                                                .firstName(pt.getPlayer().getPerson().getFirstName())
                                                                .lastName(pt.getPlayer().getPerson().getLastName())
                                                                .email(pt.getPlayer().getPerson().getEmail())
                                                                .jerseyNumber(pt.getJerseyNumber())
                                                                .position(pt.getPosition())
                                                                .status(pt.getPlayer().getStatus())
                                                                .joinedDate(pt.getJoinedDate())
                                                                .isActive(pt.getIsActive())
                                                                .nationalPlayerStatus(pt.getPlayer().getPerson().getNationalPlayerStatus())
                                                                .tries(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.TRY, 0))
                                                                .conversions(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.CONVERSION, 0))
                                                                .penalties(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.PENALTY, 0))
                                                                .dropGoals(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.DROP_GOAL, 0))
                                                                .yellowCards(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.YELLOW_CARD, 0))
                                                                .redCards(pEvents.getOrDefault(com.athleticaos.backend.enums.MatchEventType.RED_CARD, 0))
                                                                .appearances(appearances)
                                                                .build();
                                })
                                .collect(Collectors.toList());
        }

        @Override
        @Transactional(readOnly = true)
        public List<UUID> getPlayerTeamIds(UUID playerId) {
                log.info("Fetching teams for player {}", playerId);

                List<PlayerTeam> playerTeams = playerTeamRepository.findActiveTeamsByPlayerId(playerId);

                return playerTeams.stream()
                                .map(pt -> pt.getTeam().getId())
                                .collect(Collectors.toList());
        }
}
