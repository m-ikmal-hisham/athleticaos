package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentReadinessResponse;

import java.util.UUID;

public interface TournamentReadinessService {
    TournamentReadinessResponse checkReadiness(UUID tournamentId);
}
