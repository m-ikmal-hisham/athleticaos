package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.team.TeamUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TeamService {
    /**
     * Retrieves all teams.
     * 
     * @return list of team responses
     */
    List<TeamResponse> getAllTeams(UUID organisationId);

    com.athleticaos.backend.dtos.common.PageResponse<TeamResponse> getTeamsPage(
            int page,
            Integer size,
            String search,
            UUID organisationId,
            String category,
            String ageGroup,
            String state,
            String sort);

    com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse getTeamFilters();

    java.util.Map<String, Long> getTeamCategoryCounts(
            String search,
            UUID organisationId,
            String ageGroup,
            String state);

    List<com.athleticaos.backend.dtos.team.TeamOptionDTO> getTeamOptions(UUID organisationId);

    TeamResponse getTeamById(UUID id);

    TeamResponse getTeamBySlug(String slug);

    TeamResponse createTeam(TeamCreateRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

    List<TeamResponse> createBulkTeams(List<TeamCreateRequest> requests, jakarta.servlet.http.HttpServletRequest httpRequest);

    TeamResponse updateTeam(UUID id, TeamUpdateRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

    List<PlayerInTeamDTO> getPlayersByTeam(UUID teamId, UUID tournamentId);

    List<com.athleticaos.backend.dtos.team.TeamStaffDTO> getTeamStaff(UUID teamId);

    com.athleticaos.backend.dtos.team.TeamStaffDTO addTeamStaff(UUID teamId, com.athleticaos.backend.dtos.team.AddTeamStaffRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

    void removeTeamStaff(UUID teamId, UUID staffAssignmentId, jakarta.servlet.http.HttpServletRequest httpRequest);

    List<com.athleticaos.backend.dtos.team.PersonSummaryDTO> getAvailablePersonsForStaff(UUID teamId);

    TeamResponse getTeamByIdInScope(UUID id);

    TeamResponse getTeamBySlugInScope(String slug);

    List<PlayerInTeamDTO> getPlayersByTeamInScope(UUID teamId, UUID tournamentId);

    List<com.athleticaos.backend.dtos.team.PersonSummaryDTO> getAvailablePersonsForStaffInScope(UUID teamId);

    void deleteTeam(UUID id, jakarta.servlet.http.HttpServletRequest httpRequest);
}
