package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;
    private final OrganisationRepository organisationRepository;

    public List<TeamResponse> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    public TeamResponse getTeamById(UUID id) {
        return teamRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
    }

    @Transactional
    @SuppressWarnings("null")
    public TeamResponse createTeam(TeamCreateRequest request) {
        Organisation org = organisationRepository.findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        Team team = Team.builder()
                .organisation(org)
                .name(request.getName())
                .category(request.getCategory())
                .ageGroup(request.getAgeGroup())
                .build();

        return mapToResponse(teamRepository.save(team));
    }

    private TeamResponse mapToResponse(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .organisationId(team.getOrganisation().getId())
                .name(team.getName())
                .category(team.getCategory())
                .ageGroup(team.getAgeGroup())
                .build();
    }
}
