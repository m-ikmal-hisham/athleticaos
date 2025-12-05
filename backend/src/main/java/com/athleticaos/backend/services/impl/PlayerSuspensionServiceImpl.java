package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.roster.PlayerSuspensionDTO;
import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.PlayerSuspensionRepository;
import com.athleticaos.backend.services.PlayerSuspensionService;
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
public class PlayerSuspensionServiceImpl implements PlayerSuspensionService {

    private final PlayerSuspensionRepository suspensionRepository;

    @Override
    @Transactional
    public PlayerSuspension createSuspension(Tournament tournament, Team team, User player, String reason,
            int matches) {
        log.info("Creating suspension for player {} in tournament {}: {}",
                player.getId(), tournament.getId(), reason);

        PlayerSuspension suspension = PlayerSuspension.builder()
                .tournament(tournament)
                .team(team)
                .player(player)
                .reason(reason)
                .matchesRemaining(matches)
                .isActive(true)
                .build();

        return suspensionRepository.save(suspension);
    }

    @Override
    @Transactional
    public void decrementSuspensions(Match match) {
        log.info("Decrementing suspensions for match {}", match.getId());

        Tournament tournament = match.getTournament();
        Team homeTeam = match.getHomeTeam();
        Team awayTeam = match.getAwayTeam();

        // Get active suspensions for both teams
        List<PlayerSuspension> homeTeamSuspensions = suspensionRepository
                .findByTournamentIdAndTeamIdAndIsActiveTrue(tournament.getId(), homeTeam.getId());
        List<PlayerSuspension> awayTeamSuspensions = suspensionRepository
                .findByTournamentIdAndTeamIdAndIsActiveTrue(tournament.getId(), awayTeam.getId());

        // Decrement and update
        decrementAndUpdate(homeTeamSuspensions);
        decrementAndUpdate(awayTeamSuspensions);
    }

    private void decrementAndUpdate(List<PlayerSuspension> suspensions) {
        for (PlayerSuspension suspension : suspensions) {
            suspension.setMatchesRemaining(suspension.getMatchesRemaining() - 1);

            if (suspension.getMatchesRemaining() <= 0) {
                suspension.setActive(false);
                log.info("Suspension {} cleared for player {}", suspension.getId(), suspension.getPlayer().getId());
            }

            suspensionRepository.save(suspension);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlayerSuspensionDTO> getActiveSuspensions(UUID tournamentId) {
        List<PlayerSuspension> suspensions = suspensionRepository.findByTournamentIdAndIsActiveTrue(tournamentId);

        return suspensions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlayerSuspensionDTO> getPlayerActiveSuspensions(UUID tournamentId, UUID playerId) {
        return suspensionRepository.findByTournamentIdAndPlayerIdAndIsActiveTrue(tournamentId, playerId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveSuspension(UUID tournamentId, UUID playerId) {
        List<PlayerSuspensionDTO> suspensions = getPlayerActiveSuspensions(tournamentId, playerId);
        return !suspensions.isEmpty();
    }

    private PlayerSuspensionDTO toDTO(PlayerSuspension suspension) {
        return PlayerSuspensionDTO.builder()
                .id(suspension.getId())
                .tournamentId(suspension.getTournament().getId())
                .tournamentName(suspension.getTournament().getName())
                .teamId(suspension.getTeam().getId())
                .teamName(suspension.getTeam().getName())
                .playerId(suspension.getPlayer().getId())
                .playerName(suspension.getPlayer().getFirstName() + " " +
                        suspension.getPlayer().getLastName())
                .reason(suspension.getReason())
                .matchesRemaining(suspension.getMatchesRemaining())
                .isActive(suspension.isActive())
                .createdAt(suspension.getCreatedAt())
                .build();
    }
}
