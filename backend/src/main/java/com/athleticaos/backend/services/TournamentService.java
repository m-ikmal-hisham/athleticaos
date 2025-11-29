package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TournamentService {
    List<TournamentResponse> getAllTournaments();

    TournamentResponse getTournamentById(UUID id);

    TournamentResponse createTournament(TournamentCreateRequest request);

    TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request);

    void deleteTournament(UUID id);

    TournamentResponse updatePublishStatus(UUID id, boolean publish);
}
