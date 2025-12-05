package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.roster.LineupHintsDTO;
import com.athleticaos.backend.dtos.roster.TournamentPlayerDTO;

import java.util.List;
import java.util.UUID;

public interface TournamentRosterService {

    /**
     * Adds players to a tournament roster for a specific team.
     */
    List<TournamentPlayerDTO> addPlayersToRoster(UUID tournamentId, UUID teamId, List<UUID> playerIds);

    /**
     * Removes a player from a tournament roster.
     */
    void removePlayerFromRoster(UUID tournamentPlayerId);

    /**
     * Gets the roster for a specific team in a tournament.
     */
    List<TournamentPlayerDTO> getRoster(UUID tournamentId, UUID teamId);

    /**
     * Gets lineup hints for a match (eligibility and suspension info).
     */
    LineupHintsDTO getLineupHints(UUID matchId);
}
