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
     * Seeds knockout brackets from pool results, one category at a time. A category is seeded
     * only when every one of its pool matches is finished; the others are reported as skipped.
     *
     * @param tournamentId the tournament ID
     * @return which categories were seeded and which were skipped
     */
    com.athleticaos.backend.dtos.tournament.PoolSeedingResult progressPoolsToKnockout(UUID tournamentId);

    /**
     * Seeds one category's brackets if all of its pool matches are finished. Used after each pool
     * result, so a category's knockouts fill as soon as its own pools end.
     *
     * @return true if the category was seeded
     */
    boolean seedCategoryIfPoolsComplete(UUID tournamentId, UUID categoryId);

    /**
     * Generate a manual knockout bracket group, sized and named per the request.
     */
    BracketViewResponse generateManualKnockoutBracket(UUID tournamentId,
            com.athleticaos.backend.dtos.tournament.ManualBracketCreateRequest request);

    /**
     * Delete an entire knockout bracket group.
     */
    void deleteKnockoutBracket(UUID tournamentId, com.athleticaos.backend.enums.TournamentStageType type, UUID categoryId);

    /**
     * Creates a placement round robin stage and its round-robin pairings.
     */
    com.athleticaos.backend.entities.TournamentStage createPlacementRoundRobin(
            UUID tournamentId,
            com.athleticaos.backend.dtos.tournament.PlacementRoundRobinCreateRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest);

    /**
     * Changes a team/placeholder in a slot of a placement round robin stage (decision B1).
     */
    void changePlacementRoundRobinSlot(
            UUID tournamentId,
            UUID stageId,
            com.athleticaos.backend.dtos.tournament.PlacementRoundRobinSlotChangeRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest);

    /**
     * Swaps two slots in a placement round robin stage (decision B1).
     */
    void swapPlacementRoundRobinSlots(
            UUID tournamentId,
            UUID stageId,
            com.athleticaos.backend.dtos.tournament.PlacementRoundRobinSlotSwapRequest request,
            jakarta.servlet.http.HttpServletRequest httpRequest);

    /**
     * Deletes a placement round robin stage if none of its matches has a result.
     */
    void deletePlacementRoundRobinStage(
            UUID tournamentId,
            UUID stageId,
            jakarta.servlet.http.HttpServletRequest httpRequest);

}
