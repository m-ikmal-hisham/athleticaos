package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentResponse;

import java.util.List;
import java.util.UUID;

public interface TournamentService {
    List<TournamentResponse> getAllTournaments();

    TournamentResponse getTournamentById(UUID id);
}
