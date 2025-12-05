package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.playerteam.AssignPlayerRequest;
import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;

import java.util.List;
import java.util.UUID;

public interface PlayerTeamService {

    /**
     * Assign a player to a team
     */
    void assignPlayerToTeam(AssignPlayerRequest request);

    /**
     * Remove a player from a team
     */
    void removePlayerFromTeam(UUID playerId, UUID teamId);

    /**
     * Get all players in a team (roster)
     */
    List<PlayerInTeamDTO> getTeamRoster(UUID teamId);

    /**
     * Get all teams a player is assigned to
     */
    List<UUID> getPlayerTeamIds(UUID playerId);
}
