package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.roster.EligibilityResult;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.Player;

/**
 * Service for checking player eligibility.
 */
public interface EligibilityService {

    /**
     * Checks if a player is eligible for a tournament/category based on rules.
     * 
     * @param tournament The tournament to check eligibility for
     * @param category   The specific category (optional)
     * @param player     The player to check
     * @return EligibilityResult containing eligibility status and reason
     */
    EligibilityResult checkPlayerEligibility(Tournament tournament,
            com.athleticaos.backend.entities.TournamentCategory category, Player player);
}
