package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface MatchService {
        List<MatchResponse> getAllMatches();

        List<MatchResponse> getMatchesByTournament(UUID tournamentId);

        MatchResponse getMatchById(UUID id);

        MatchResponse createMatch(MatchCreateRequest request);

        MatchResponse updateMatch(UUID id, MatchUpdateRequest request);

        void deleteMatch(UUID id);
}
