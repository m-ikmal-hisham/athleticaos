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
    List<TeamResponse> getAllTeams();

    TeamResponse getTeamById(UUID id);

    TeamResponse getTeamBySlug(String slug);

    TeamResponse createTeam(TeamCreateRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

    TeamResponse updateTeam(UUID id, TeamUpdateRequest request, jakarta.servlet.http.HttpServletRequest httpRequest);

    List<PlayerInTeamDTO> getPlayersByTeam(UUID teamId);
}
