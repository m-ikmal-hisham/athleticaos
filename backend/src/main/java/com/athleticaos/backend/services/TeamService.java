package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.team.TeamUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TeamService {
    List<TeamResponse> getAllTeams();

    TeamResponse getTeamById(UUID id);

    TeamResponse createTeam(TeamCreateRequest request);

    TeamResponse updateTeam(UUID id, TeamUpdateRequest request);
}
