package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.match.MatchCreateRequest;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.match.MatchUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface MatchService {
        List<MatchResponse> getAllMatches();

        List<MatchResponse> getAllMatches(String status, UUID tournamentId, UUID teamId);

        List<MatchResponse> getMatchesByTournament(UUID tournamentId);

        MatchResponse getMatchById(UUID id);

        MatchResponse createMatch(MatchCreateRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

        MatchResponse updateMatch(UUID id, MatchUpdateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        void deleteMatch(UUID id);

        void deleteMatches(List<UUID> ids);

        List<MatchResponse> getMatchesByStatus(String status);

        void recalculateMatchScores(UUID matchId);

        MatchResponse updateMatchStatus(UUID id, String status, jakarta.servlet.http.HttpServletRequest httpRequest);

        MatchResponse getMatchByCode(String matchCode);

        /**
         * Records a match as won without being played — a walkover (one side forfeited) or a bye
         * (no opponent at all) — and progresses the winner as a normal completion would.
         *
         * @param winnerTeamId the team advancing; may be null for a bye, where the single
         *                     entered team is inferred
         */
        MatchResponse recordUnplayedResult(UUID id, com.athleticaos.backend.enums.MatchResultType resultType,
                        UUID winnerTeamId, jakarta.servlet.http.HttpServletRequest httpRequest);

        /**
         * Marks every knockout match that has one team and no possible opponent as a bye and
         * advances that team. Safe to re-run.
         *
         * @return the number of byes applied
         */
        int applyByesForTournament(UUID tournamentId);

        com.athleticaos.backend.dtos.match.OperationsDashboardDTO getOperationsDashboard();
}
