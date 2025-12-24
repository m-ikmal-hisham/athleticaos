package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.roster.PlayerSuspensionDTO;
import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.PlayerSuspension;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.Player;

import java.util.List;
import java.util.UUID;

public interface PlayerSuspensionService {

    /**
     * Creates a new suspension for a player.
     */
    PlayerSuspension createSuspension(Tournament tournament, Team team, Player player, String reason, int matches);

    /**
     * Decrements suspensions for teams involved in a completed match.
     */
    void decrementSuspensions(Match match);

    /**
     * Gets all active suspensions for a tournament.
     */
    /**
     * Gets all active suspensions for a tournament.
     */
    List<PlayerSuspensionDTO> getActiveSuspensions(UUID tournamentId);

    /**
     * Gets all suspensions (active and inactive) for a tournament.
     */
    List<PlayerSuspensionDTO> getAllSuspensions(UUID tournamentId);

    /**
     * Gets active suspensions for a specific player in a tournament.
     */
    List<PlayerSuspensionDTO> getPlayerActiveSuspensions(UUID tournamentId, UUID playerId);

    /**
     * Checks if a player has any active suspensions in a tournament.
     */
    boolean hasActiveSuspension(UUID tournamentId, UUID playerId);
}
