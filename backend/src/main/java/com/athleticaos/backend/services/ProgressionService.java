package com.athleticaos.backend.services;

import java.util.UUID;

public interface ProgressionService {

    /**
     * Process match completion and advance winners to next stage
     * 
     * @param matchId the completed match ID
     */
    void processMatchCompletion(UUID matchId);

    /**
     * Automatically progress all completed matches in a tournament
     * 
     * @param tournamentId the tournament ID
     * @return number of matches progressed
     */
    int progressTournament(UUID tournamentId);

    /**
     * Check if a tournament stage is complete (all matches finished)
     * 
     * @param stageId the stage ID
     * @return true if all matches in stage are completed
     */
    boolean isStageComplete(UUID stageId);

    /**
     * Validate if progression can occur for a match
     * 
     * @param matchId the match ID
     * @return true if match is completed and has a winner
     */
    boolean canProgress(UUID matchId);
}
