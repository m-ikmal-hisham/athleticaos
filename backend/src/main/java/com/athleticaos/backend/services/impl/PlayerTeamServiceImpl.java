package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.playerteam.AssignPlayerRequest;
import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.PlayerTeam;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.services.PlayerTeamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlayerTeamServiceImpl implements PlayerTeamService {

        private final PlayerTeamRepository playerTeamRepository;
        private final PlayerRepository playerRepository;
        private final TeamRepository teamRepository;

        @Override
        @Transactional
        @SuppressWarnings("null")
        public void assignPlayerToTeam(AssignPlayerRequest request) {
                log.info("Assigning player {} to team {}", request.getPlayerId(), request.getTeamId());

                Player player = playerRepository.findById(request.getPlayerId())
                                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

                Team team = teamRepository.findById(request.getTeamId())
                                .orElseThrow(() -> new IllegalArgumentException("Team not found"));

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
        @Transactional(readOnly = true)
        public List<PlayerInTeamDTO> getTeamRoster(UUID teamId) {
                log.info("Fetching roster for team {}", teamId);

                List<PlayerTeam> playerTeams = playerTeamRepository.findActiveRosterByTeamId(teamId);

                return playerTeams.stream()
                                .filter(com.athleticaos.backend.utils.StreamUtils
                                                .distinctByKey(pt -> pt.getPlayer().getId()))
                                .map(pt -> PlayerInTeamDTO.builder()
                                                .playerId(pt.getPlayer().getId())
                                                .firstName(pt.getPlayer().getPerson().getFirstName())
                                                .lastName(pt.getPlayer().getPerson().getLastName())
                                                .email(pt.getPlayer().getPerson().getEmail())
                                                .jerseyNumber(pt.getJerseyNumber())
                                                .position(pt.getPosition())
                                                .status(pt.getPlayer().getStatus())
                                                .joinedDate(pt.getJoinedDate())
                                                .isActive(pt.getIsActive())
                                                .build())
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
