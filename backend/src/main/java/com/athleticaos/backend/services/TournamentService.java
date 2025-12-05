package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentDashboardResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TournamentService {
        List<TournamentResponse> getAllTournaments();

        List<TournamentResponse> getPublishedTournaments();

        TournamentResponse getTournamentById(UUID id);

        TournamentDashboardResponse getTournamentDashboard(UUID id);

        TournamentResponse createTournament(TournamentCreateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        void deleteTournament(UUID id);

        TournamentResponse updatePublishStatus(UUID id, boolean publish,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        byte[] exportMatches(UUID tournamentId);

        byte[] exportResults(UUID tournamentId);
}
