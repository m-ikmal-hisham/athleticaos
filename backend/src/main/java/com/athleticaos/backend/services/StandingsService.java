package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.standing.StandingsResponse;

import java.util.List;
import java.util.UUID;

public interface StandingsService {
    List<StandingsResponse> getStandings(UUID tournamentId);
}
