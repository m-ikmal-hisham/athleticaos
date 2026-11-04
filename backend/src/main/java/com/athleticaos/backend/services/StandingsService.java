package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.dtos.tournament.PlacementStandingRowResponse;
import com.athleticaos.backend.dtos.tournament.PublicPlacementRoundRobinResponse;
import com.athleticaos.backend.entities.TournamentStage;

import java.util.List;
import java.util.UUID;

public interface StandingsService {
    List<StandingsResponse> getStandings(UUID tournamentId);

    List<PublicPlacementRoundRobinResponse> getPlacementRoundRobins(UUID tournamentId, UUID categoryId);

    List<PlacementStandingRowResponse> calculatePlacementRoundRobinTable(TournamentStage stage);
}
