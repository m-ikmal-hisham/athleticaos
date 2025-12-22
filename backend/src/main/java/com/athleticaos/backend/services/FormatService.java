package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.BracketGenerationRequest;
import java.util.List;
import java.util.UUID;

public interface FormatService {

    /**
     * Generate the schedule for a tournament based on the selected format.
     * This handles creating stages (Pools/Rounds) and initial matches.
     *
     * @param tournamentId the tournament ID
     * @param request      the generation configuration
     */
    void generateSchedule(UUID tournamentId, BracketGenerationRequest request);

    List<com.athleticaos.backend.entities.TournamentStage> generateStructure(
            com.athleticaos.backend.entities.Tournament tournament, int poolCount, BracketGenerationRequest request);

    void clearSchedule(UUID tournamentId);

    void clearSchedule(UUID tournamentId, boolean clearStructure);
}
