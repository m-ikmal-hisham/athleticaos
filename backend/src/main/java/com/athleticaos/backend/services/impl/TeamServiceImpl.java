package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.team.TeamCreateRequest;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.team.TeamUpdateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.services.PlayerTeamService;
import com.athleticaos.backend.services.TeamService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.utils.SlugGenerator;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
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
    private final UserService userService;
    private final PlayerTeamService playerTeamService;
    private final AuditLogger auditLogger;

    @Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams() {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        List<Team> teams;
        if (accessibleIds == null) {
            teams = teamRepository.findAll();
        } else if (accessibleIds.isEmpty()) {
            teams = java.util.Collections.emptyList();
        } else {
            teams = teamRepository.findByOrganisation_IdIn(accessibleIds);
        }

        return teams.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public TeamResponse getTeamById(UUID id) {
        return teamRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
    }

    @SuppressWarnings("null")
    @Transactional(readOnly = true)
    public TeamResponse getTeamBySlug(String slug) {
        log.info("Fetching team by slug: {}", slug);
        return teamRepository.findBySlug(slug)
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Team not found with slug: " + slug));
    }

    @Transactional
    @SuppressWarnings("null")
    public TeamResponse createTeam(TeamCreateRequest request, HttpServletRequest httpRequest) {
        log.info("Creating team: {}", request.getName());
        Organisation org = organisationRepository.findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        // Generate unique slug
        // Generate unique slug
        String slug = SlugGenerator.generateUniqueSlug(request.getName(), teamRepository::existsBySlug);

        Team team = Team.builder()
                .organisation(org)
                .slug(slug)
                .name(request.getName())
                .category(request.getCategory())
                .ageGroup(request.getAgeGroup())
                .division(request.getDivision())
                .state(request.getState())
                .status("Active")
                .build();

        Team savedTeam = teamRepository.save(team);
        auditLogger.logTeamCreated(savedTeam, httpRequest);
        return mapToResponse(savedTeam);
    }

    @Transactional
    @SuppressWarnings("null")
    public TeamResponse updateTeam(UUID id, TeamUpdateRequest request, HttpServletRequest httpRequest) {
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

        Team savedTeam = teamRepository.save(team);
        auditLogger.logTeamUpdated(savedTeam, httpRequest);
        return mapToResponse(savedTeam);
    }

    private TeamResponse mapToResponse(Team team) {
        return TeamResponse.builder()
                .id(team.getId())
                .organisationId(team.getOrganisation().getId())
                .organisationName(team.getOrganisation().getName())
                .slug(team.getSlug())
                .name(team.getName())
                .category(team.getCategory())
                .ageGroup(team.getAgeGroup())
                .division(team.getDivision())
                .level(team.getDivision()) // Map division to level for now
                .state(team.getState())
                .status(team.getStatus())
                .players(playerTeamService.getTeamRoster(team.getId()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> getPlayersByTeam(UUID teamId) {
        return playerTeamService.getTeamRoster(teamId);
    }
}
