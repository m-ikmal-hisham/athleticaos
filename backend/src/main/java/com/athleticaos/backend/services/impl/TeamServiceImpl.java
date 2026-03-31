package com.athleticaos.backend.services.impl;

import com.athleticaos.backend.util.UrlSanitizer;

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
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.StaffRole;
import com.athleticaos.backend.entities.TeamStaff;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.StaffRoleRepository;
import com.athleticaos.backend.repositories.TeamStaffRepository;
import com.athleticaos.backend.repositories.OrganisationPersonRepository;
import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.dtos.team.AddTeamStaffRequest;
import com.athleticaos.backend.dtos.team.TeamStaffDTO;
import java.time.LocalDate;
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
@SuppressWarnings("null")
@RequiredArgsConstructor
@Slf4j
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final OrganisationRepository organisationRepository;
    private final UserService userService;
    private final PlayerTeamService playerTeamService;
    private final AuditLogger auditLogger;
    private final TeamStaffRepository teamStaffRepository;
    private final StaffRoleRepository staffRoleRepository;
    private final PersonRepository personRepository;
    private final OrganisationPersonRepository organisationPersonRepository;

    @Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams(UUID organisationId) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        java.util.Set<UUID> targetIds = new java.util.HashSet<>();

        if (organisationId != null) {
            // If filtering by specific org, ensure we fetch its hierarchy
            targetIds = resolveOrganisationHierarchy(organisationId);

            // Security check: Ensure requested org is within user's accessible scope
            if (accessibleIds != null) {
                targetIds.retainAll(accessibleIds);
            }
        } else {
            // No filter, use user's full scope
            if (accessibleIds != null) {
                targetIds.addAll(accessibleIds);
            } else {
                // Super Admin with no filter -> All teams
                return teamRepository.findAll().stream()
                        .map(this::mapToResponse)
                        .collect(Collectors.toList());
            }
        }

        if (targetIds.isEmpty() && organisationId != null) {
            return java.util.Collections.emptyList();
        } else if (targetIds.isEmpty() && accessibleIds != null && !accessibleIds.isEmpty()) {
            // Should not happen if logic above is correct, but safe fallback
            return java.util.Collections.emptyList();
        }

        List<Team> teams = teamRepository.findByOrganisation_IdIn(targetIds);

        return teams.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private java.util.Set<UUID> resolveOrganisationHierarchy(UUID rootId) {
        java.util.Set<UUID> hierarchy = new java.util.HashSet<>();
        java.util.Queue<UUID> queue = new java.util.LinkedList<>();

        queue.add(rootId);
        hierarchy.add(rootId);

        while (!queue.isEmpty()) {
            UUID currentId = queue.poll();
            List<Organisation> children = organisationRepository.findByParentOrgId(currentId);
            for (Organisation child : children) {
                if (!hierarchy.contains(child.getId())) {
                    hierarchy.add(child.getId());
                    queue.add(child.getId());
                }
            }
        }
        return hierarchy;
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamById(UUID id) {
        return teamRepository.findById(java.util.Objects.requireNonNull(id, "ID must not be null"))
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeamBySlug(String slug) {
        log.info("Fetching team by slug: {}", slug);
        return teamRepository.findBySlug(java.util.Objects.requireNonNull(slug, "Slug must not be null"))
                .map(this::mapToResponse)
                .orElseThrow(() -> new EntityNotFoundException("Team not found with slug: " + slug));
    }

    @Transactional
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
                .shortName(request.getShortName())
                .category(request.getCategory())
                .ageGroup(request.getAgeGroup())
                .division(request.getDivision())
                .state(request.getState())
                .logoUrl(request.getLogoUrl())
                .status("Active")
                .build();

        Team savedTeam = teamRepository.save(team);
        auditLogger.logTeamCreated(savedTeam, httpRequest);
        return mapToResponse(savedTeam);
    }

    @Transactional
    public List<TeamResponse> createBulkTeams(List<TeamCreateRequest> requests, HttpServletRequest httpRequest) {
        log.info("Creating bulk teams: {} items", requests.size());
        return requests.stream()
                .map(req -> this.createTeam(req, httpRequest))
                .collect(Collectors.toList());
    }

    @Transactional
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
        if (request.getLogoUrl() != null) {
            team.setLogoUrl(request.getLogoUrl());
        }
        if (request.getShortName() != null) {
            team.setShortName(request.getShortName());
        }
        if (request.getOrganisationId() != null) {
            Organisation newOrg = organisationRepository.findById(request.getOrganisationId())
                    .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));
            team.setOrganisation(newOrg);
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
                .shortName(team.getShortName())
                .category(team.getCategory())
                .ageGroup(team.getAgeGroup())
                .division(team.getDivision())
                .level(team.getOrganisation().getOrgLevel() != null ? team.getOrganisation().getOrgLevel().name() : null)
                .organisationLevel(team.getOrganisation().getOrgLevel() != null ? team.getOrganisation().getOrgLevel().name() : null)
                .state(team.getState())
                .status(team.getStatus())
                .logoUrl(UrlSanitizer.sanitize(team.getLogoUrl() != null ? team.getLogoUrl() : (team.getOrganisation() != null ? team.getOrganisation().getLogoUrl() : null)))
                .players(playerTeamService.getTeamRoster(team.getId()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> getPlayersByTeam(UUID teamId) {
        return playerTeamService.getTeamRoster(teamId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamStaffDTO> getTeamStaff(UUID teamId) {
        return teamStaffRepository.findByTeamId(teamId).stream()
                .map(this::mapToTeamStaffDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TeamStaffDTO addTeamStaff(UUID teamId, AddTeamStaffRequest request, HttpServletRequest httpRequest) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
        Person person = personRepository.findById(request.getPersonId())
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        StaffRole role = staffRoleRepository.findById(request.getStaffRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Staff Role not found"));

        if (teamStaffRepository.findByTeamIdAndPersonIdAndStaffRoleId(teamId, person.getId(), role.getId()).isPresent()) {
            throw new IllegalArgumentException("Person is already assigned this role in the team");
        }

        TeamStaff teamStaff = TeamStaff.builder()
                .team(team)
                .person(person)
                .staffRole(role)
                .joinedAt(LocalDate.now())
                .isWorldRugbyCertified(request.isWorldRugbyCertified())
                .build();
        
        teamStaff = teamStaffRepository.save(teamStaff);
        
        // Auto-link person to organisation
        UUID orgId = team.getOrganisation().getId();
        if (!organisationPersonRepository.existsByOrganisationIdAndPersonId(orgId, person.getId())) {
            OrganisationPerson op = OrganisationPerson.builder()
                    .organisation(team.getOrganisation())
                    .person(person)
                    .build();
            organisationPersonRepository.save(op);
        }

        return mapToTeamStaffDTO(teamStaff);
    }

    @Override
    @Transactional
    public void removeTeamStaff(UUID teamId, UUID staffAssignmentId, HttpServletRequest httpRequest) {
        TeamStaff teamStaff = teamStaffRepository.findById(staffAssignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Team Staff not found"));
        if (!teamStaff.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Staff does not belong to this team");
        }
        teamStaffRepository.delete(teamStaff);
    }

    private TeamStaffDTO mapToTeamStaffDTO(TeamStaff teamStaff) {
        return TeamStaffDTO.builder()
                .id(teamStaff.getId())
                .personId(teamStaff.getPerson().getId())
                .firstName(teamStaff.getPerson().getFirstName())
                .lastName(teamStaff.getPerson().getLastName())
                .staffRoleId(teamStaff.getStaffRole().getId())
                .staffRoleName(teamStaff.getStaffRole().getName())
                .staffRoleDescription(teamStaff.getStaffRole().getDescription())
                .joinedAt(teamStaff.getJoinedAt())
                .isWorldRugbyCertified(teamStaff.isWorldRugbyCertified())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.team.PersonSummaryDTO> getAvailablePersonsForStaff(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
        UUID orgId = team.getOrganisation().getId();

        return organisationPersonRepository.findByOrganisationIdOrHierarchy(orgId).stream()
                .map(op -> op.getPerson())
                .map(p -> com.athleticaos.backend.dtos.team.PersonSummaryDTO.builder()
                        .id(p.getId().toString())
                        .firstName(p.getFirstName())
                        .lastName(p.getLastName())
                        .email(p.getEmail())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteTeam(UUID id, HttpServletRequest httpRequest) {
        log.info("Deleting team: {}", id);
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));

        teamRepository.delete(team);
        auditLogger.logTeamDeleted(team, httpRequest);
    }
}

