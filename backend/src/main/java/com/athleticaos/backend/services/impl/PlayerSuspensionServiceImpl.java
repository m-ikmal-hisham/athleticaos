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

    /**
     * Creates a new suspension for a player in a tournament.
     * 
     * This is typically called automatically when:
     * - A player receives a RED_CARD
     * - A player receives 2 YELLOW_CARDs in the same match
     * 
     * @param tournament The tournament where the suspension applies
     * @param team       The team the player belongs to
     * @param player     The player being suspended
     * @param reason     The reason for suspension (e.g., "RED_CARD", "2
     *                   YELLOW_CARDS")
     * @param matches    Number of matches the player is suspended for
     * @return The created PlayerSuspension entity
     */
    @Override
    @Transactional
    public PlayerSuspension createSuspension(Tournament tournament, Team team, Player player, String reason,
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

    /**
     * Decrements all active suspensions for both teams in a completed match.
     * 
     * This method is called automatically when a match status is updated to
     * COMPLETED.
     * It reduces the matchesRemaining count for all active suspensions and
     * deactivates
     * suspensions that have reached zero matches remaining.
     * 
     * IMPORTANT: This only affects suspensions for the teams playing in the match,
     * ensuring suspensions are only served when the team actually plays.
     * 
     * @param match The completed match
     */
    @Override
    @Transactional
    public void decrementSuspensions(Match match) {
        log.info("Decrementing suspensions for match {}", match.getId());

        Tournament tournament = match.getTournament();
        Team homeTeam = match.getHomeTeam();
        Team awayTeam = match.getAwayTeam();

        // Get active suspensions for both teams in this tournament
        List<PlayerSuspension> homeTeamSuspensions = suspensionRepository
                .findByTournamentIdAndTeamIdAndIsActiveTrue(tournament.getId(), homeTeam.getId());
        List<PlayerSuspension> awayTeamSuspensions = suspensionRepository
                .findByTournamentIdAndTeamIdAndIsActiveTrue(tournament.getId(), awayTeam.getId());

        // Decrement and update suspensions for both teams
        decrementAndUpdate(homeTeamSuspensions);
        decrementAndUpdate(awayTeamSuspensions);
    }

    /**
     * Helper method to decrement a list of suspensions and deactivate completed
     * ones.
     * 
     * For each suspension:
     * 1. Reduce matchesRemaining by 1
     * 2. If matchesRemaining <= 0, set isActive to false
     * 3. Save the updated suspension
     * 
     * @param suspensions List of suspensions to process
     */
    private void decrementAndUpdate(List<PlayerSuspension> suspensions) {
        for (PlayerSuspension suspension : suspensions) {
            suspension.setMatchesRemaining(suspension.getMatchesRemaining() - 1);

            // If suspension is served, deactivate it
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
                .playerName(suspension.getPlayer().getPerson().getFirstName() + " " +
                        suspension.getPlayer().getPerson().getLastName())
                .reason(suspension.getReason())
                .matchesRemaining(suspension.getMatchesRemaining())
                .isActive(suspension.isActive())
                .createdAt(suspension.getCreatedAt())
                .build();
    }
}
