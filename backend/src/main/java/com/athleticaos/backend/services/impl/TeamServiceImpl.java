package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.team.TeamUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.services.TeamService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamServiceImpl implements TeamService {

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
        log.info("Creating team: {}", request.getName());
        Organisation org = organisationRepository.findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        Team team = Team.builder()
                .organisation(org)
                .name(request.getName())
                .category(request.getCategory())
                .ageGroup(request.getAgeGroup())
                .division(request.getDivision())
                .state(request.getState())
                .status("Active")
                .build();

        return mapToResponse(teamRepository.save(team));
    }

    @Transactional
    @SuppressWarnings("null")
    public TeamResponse updateTeam(UUID id, TeamUpdateRequest request) {
        log.info("Updating team: {}", id);
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        if (request.getName() != null) {
            team.setName(request.getName());
        }
        if (request.getCategory() != null) {
            team.setCategory(request.getCategory());
        }
        if (request.getAgeGroup() != null) {
            team.setAgeGroup(request.getAgeGroup());
        }
        if (request.getDivision() != null) {
            team.setDivision(request.getDivision());
        }
        if (request.getState() != null) {
            team.setState(request.getState());
        }
        if (request.getStatus() != null) {
            team.setStatus(request.getStatus());
        }

        return mapToResponse(teamRepository.save(team));
    }

    private TeamResponse mapToResponse(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .organisationId(team.getOrganisation().getId())
                .name(team.getName())
                .category(team.getCategory())
                .ageGroup(team.getAgeGroup())
                .division(team.getDivision())
                .level(team.getDivision()) // Map division to level for now
                .state(team.getState())
                .status(team.getStatus())
                .build();
    }
}
