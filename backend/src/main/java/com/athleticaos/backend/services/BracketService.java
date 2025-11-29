package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import com.athleticaos.backend.dtos.tournament.BracketViewResponse;

import java.util.UUID;

public interface BracketService {

    /**
     * Get the bracket structure for a tournament
     * 
     * @param tournamentId the tournament ID
     * @return bracket view with all stages and matches
     */
    BracketViewResponse getBracketForTournament(UUID tournamentId);

    /**
     * Generate bracket for a tournament based on the provided request
     * 
     * @param tournamentId the tournament ID
     * @param request      the bracket generation request
     * @return the generated bracket view
     */
    BracketViewResponse generateBracketForTournament(UUID tournamentId, BracketGenerationRequest request);

    /**
     * Progress pool winners and runners-up to knockout stage
     * 
     * @param tournamentId the tournament ID
     */
    void progressPoolsToKnockout(UUID tournamentId);
}
