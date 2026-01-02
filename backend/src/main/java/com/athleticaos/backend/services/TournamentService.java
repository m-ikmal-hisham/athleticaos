package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.tournament.TournamentCreateRequest;
import com.athleticaos.backend.dtos.tournament.TournamentDashboardResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.dtos.tournament.TournamentUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TournamentService {
        List<TournamentResponse> getAllTournaments(String level);

        List<TournamentResponse> getTournamentsBySeason(java.util.UUID seasonId);

        List<TournamentResponse> getPublishedTournaments();

        TournamentResponse getTournamentById(java.util.UUID id);

        TournamentResponse getTournamentBySlug(String slug);

        TournamentDashboardResponse getTournamentDashboard(java.util.UUID id);

        TournamentResponse createTournament(TournamentCreateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        TournamentResponse updateTournament(UUID id, TournamentUpdateRequest request,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        void deleteTournament(UUID id);

        TournamentResponse updatePublishStatus(UUID id, boolean publish,
                        jakarta.servlet.http.HttpServletRequest httpRequest);

        byte[] exportMatches(UUID tournamentId);

        byte[] exportResults(UUID tournamentId);

        List<TeamResponse> getTeamsByTournament(UUID tournamentId);

        void addTeamsToTournament(UUID tournamentId, List<UUID> teamIds);

        void removeTeamFromTournament(UUID tournamentId, UUID teamId);

        void updateTeamPool(UUID tournamentId, UUID teamId, String poolNumber);

        void generateSchedule(UUID tournamentId,
                        com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request);

        List<com.athleticaos.backend.entities.TournamentStage> generateStructure(UUID tournamentId, int poolCount,
                        com.athleticaos.backend.dtos.tournament.BracketGenerationRequest request);

        com.athleticaos.backend.dtos.match.MatchResponse createMatch(UUID tournamentId,
                        com.athleticaos.backend.dtos.match.MatchCreateRequest request);

        List<com.athleticaos.backend.dtos.match.MatchResponse> getMatchesByTournament(UUID tournamentId);

        void clearSchedule(UUID tournamentId);

        void clearSchedule(UUID tournamentId, boolean clearStructure);

        com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO getFormatConfig(UUID tournamentId);

        com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO updateFormatConfig(UUID tournamentId,
                        com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO configDTO);

        TournamentResponse updateStatus(UUID id, com.athleticaos.backend.enums.TournamentStatus status,
                        jakarta.servlet.http.HttpServletRequest httpRequest);
}
