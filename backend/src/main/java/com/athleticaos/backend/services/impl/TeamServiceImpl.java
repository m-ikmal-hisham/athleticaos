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
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.services.AccessScopeService;
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
import java.util.Set;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
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
    private final TournamentTeamRepository tournamentTeamRepository;
    private final AccessScopeService accessScopeService;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<TeamResponse> getAllTeams(UUID organisationId) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        java.util.Set<UUID> targetIds = new java.util.HashSet<>();
        List<Team> teams;

        if (organisationId != null) {
            // If filtering by specific org, ensure we fetch its hierarchy
            targetIds = resolveOrganisationHierarchy(organisationId);

            // Security check: Ensure requested org is within user's accessible scope
            if (accessibleIds != null) {
                targetIds.retainAll(accessibleIds);
            }

            if (targetIds.isEmpty()) {
                return java.util.Collections.emptyList();
            }
            teams = teamRepository.findByOrganisation_IdInWithOrganisation(targetIds);
        } else {
            // No filter, use user's full scope
            if (accessibleIds != null) {
                targetIds.addAll(accessibleIds);
                if (targetIds.isEmpty()) {
                    return java.util.Collections.emptyList();
                }
                teams = teamRepository.findByOrganisation_IdInWithOrganisation(targetIds);
            } else {
                // Super Admin with no filter -> All teams
                teams = teamRepository.findAllWithOrganisation();
            }
        }

        if (teams.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        List<UUID> teamIds = teams.stream().map(Team::getId).collect(Collectors.toList());
        List<Object[]> activeTournamentsRows = tournamentTeamRepository.findActiveTournamentsForTeamIds(teamIds);
        Map<UUID, List<TeamResponse.TournamentSummary>> tournamentsByTeamId = new HashMap<>();
        for (Object[] row : activeTournamentsRows) {
            UUID teamId = (UUID) row[0];
            com.athleticaos.backend.entities.Tournament t = (com.athleticaos.backend.entities.Tournament) row[1];
            if (teamId != null && t != null) {
                tournamentsByTeamId
                        .computeIfAbsent(teamId, k -> new ArrayList<>())
                        .add(TeamResponse.TournamentSummary.builder()
                                .id(t.getId())
                                .name(t.getName())
                                .build());
            }
        }

        return teams.stream()
                .map(t -> mapToResponse(t, tournamentsByTeamId.getOrDefault(t.getId(), List.of())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public com.athleticaos.backend.dtos.common.PageResponse<TeamResponse> getTeamsPage(
            int page,
            Integer size,
            String search,
            UUID organisationId,
            String category,
            String ageGroup,
            String state,
            String sort) {
        TeamScopeResolution scope = resolveTeamScope(organisationId);
        int safeSize = clampPageSize(size);
        int safePage = Math.max(0, page);

        if (scope.isDisjoint()) {
            return new com.athleticaos.backend.dtos.common.PageResponse<>(
                    List.of(), safePage, safeSize, 0L, 0, false);
        }

        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(safePage, safeSize);
        org.springframework.data.jpa.domain.Specification<Team> spec = com.athleticaos.backend.repositories.spec.AdminDirectorySpecifications.adminTeams(
                search,
                category,
                ageGroup,
                state,
                scope.targetOrgIds(),
                scope.restrictToOrgIds(),
                scope.isDisjoint());

        org.springframework.data.domain.Page<Team> teamPage = teamRepository.findAll(spec, pageRequest);
        return com.athleticaos.backend.dtos.common.PageResponse.of(teamPage, this::mapTeamsForPage);
    }

    @Override
    @Transactional(readOnly = true)
    public com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse getTeamFilters() {
        TeamScopeResolution scope = resolveTeamScope(null);
        if (scope.isDisjoint()) {
            return new com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse(
                    List.of(), List.of(), List.of(), List.of());
        }

        jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        // 1. Organisations: [{id, name}]
        jakarta.persistence.criteria.CriteriaQuery<Object[]> orgCq = cb.createQuery(Object[].class);
        jakarta.persistence.criteria.Root<Team> orgRoot = orgCq.from(Team.class);
        jakarta.persistence.criteria.Join<Team, Organisation> orgJoin = orgRoot.join("organisation", jakarta.persistence.criteria.JoinType.INNER);
        orgCq.multiselect(orgJoin.get("id"), orgJoin.get("name")).distinct(true);
        if (scope.restrictToOrgIds()) {
            orgCq.where(orgJoin.get("id").in(scope.targetOrgIds()));
        }
        List<Object[]> orgRows = entityManager.createQuery(orgCq).getResultList();
        java.util.Map<String, com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse.OrganisationOption> orgMap = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Object[] r : orgRows) {
            if (r != null && r.length >= 2 && r[0] != null && r[1] != null) {
                UUID id = (UUID) r[0];
                String name = r[1].toString().trim();
                if (!name.isEmpty() && !orgMap.containsKey(name)) {
                    orgMap.put(name, new com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse.OrganisationOption(id, name));
                }
            }
        }
        List<com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse.OrganisationOption> organisations = new ArrayList<>(orgMap.values());

        // 2. Categories
        List<String> rawCategories = queryDistinctField(cb, "category", scope);
        List<String> categories = cleanOptions(rawCategories);

        // 3. Age groups
        List<String> rawAgeGroups = queryDistinctField(cb, "ageGroup", scope);
        List<String> ageGroups = cleanOptions(rawAgeGroups);

        // 4. States
        List<String> rawStates = queryDistinctField(cb, "state", scope);
        List<String> states = cleanOptions(rawStates);

        return new com.athleticaos.backend.dtos.team.AdminTeamFiltersResponse(
                organisations, categories, ageGroups, states);
    }

    private List<String> queryDistinctField(jakarta.persistence.criteria.CriteriaBuilder cb, String fieldName, TeamScopeResolution scope) {
        jakarta.persistence.criteria.CriteriaQuery<String> cq = cb.createQuery(String.class);
        jakarta.persistence.criteria.Root<Team> root = cq.from(Team.class);
        cq.select(root.get(fieldName)).distinct(true);

        List<jakarta.persistence.criteria.Predicate> preds = new ArrayList<>();
        preds.add(cb.isNotNull(root.get(fieldName)));
        if (scope.restrictToOrgIds()) {
            preds.add(root.get("organisation").get("id").in(scope.targetOrgIds()));
        }
        cq.where(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        return entityManager.createQuery(cq).getResultList();
    }

    private List<String> cleanOptions(List<String> raw) {
        if (raw == null) return List.of();
        java.util.TreeSet<String> set = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (String s : raw) {
            if (s != null && !s.isBlank()) {
                set.add(s.trim());
            }
        }
        return new ArrayList<>(set);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getTeamCategoryCounts(
            String search,
            UUID organisationId,
            String ageGroup,
            String state) {
        TeamScopeResolution scope = resolveTeamScope(organisationId);
        Map<String, Long> counts = new java.util.LinkedHashMap<>();
        counts.put("ALL", 0L);

        if (scope.isDisjoint()) {
            return counts;
        }

        jakarta.persistence.criteria.CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        jakarta.persistence.criteria.CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        jakarta.persistence.criteria.Root<Team> root = cq.from(Team.class);

        org.springframework.data.jpa.domain.Specification<Team> spec = com.athleticaos.backend.repositories.spec.AdminDirectorySpecifications.adminTeams(
                search,
                null,
                ageGroup,
                state,
                scope.targetOrgIds(),
                scope.restrictToOrgIds(),
                scope.isDisjoint());

        jakarta.persistence.criteria.Predicate predicate = spec.toPredicate(root, cq, cb);
        jakarta.persistence.criteria.Expression<String> categoryExpr = root.get("category");
        cq.multiselect(categoryExpr, cb.count(root));
        if (predicate != null) {
            cq.where(predicate);
        }
        cq.groupBy(categoryExpr);

        List<Object[]> rows = entityManager.createQuery(cq).getResultList();
        long total = 0L;
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                String cat = row[0].toString().trim();
                long c = ((Number) row[1]).longValue();
                counts.put(cat, c);
                counts.put(cat.toUpperCase(), c);
                total += c;
            }
        }
        counts.put("ALL", total);
        return counts;
    }

    private record TeamScopeResolution(
            Set<UUID> targetOrgIds,
            boolean restrictToOrgIds,
            boolean isDisjoint) {}

    private TeamScopeResolution resolveTeamScope(UUID organisationId) {
        Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();

        if (organisationId != null) {
            Set<UUID> targetIds = resolveOrganisationHierarchy(organisationId);
            if (accessibleIds != null) {
                targetIds.retainAll(accessibleIds);
            }
            if (targetIds.isEmpty()) {
                return new TeamScopeResolution(null, true, true);
            }
            return new TeamScopeResolution(targetIds, true, false);
        } else {
            if (accessibleIds != null) {
                if (accessibleIds.isEmpty()) {
                    return new TeamScopeResolution(null, true, true);
                }
                return new TeamScopeResolution(accessibleIds, true, false);
            } else {
                return new TeamScopeResolution(null, false, false);
            }
        }
    }

    private List<TeamResponse> mapTeamsForPage(List<Team> teams) {
        if (teams.isEmpty()) {
            return List.of();
        }
        List<UUID> teamIds = teams.stream().map(Team::getId).collect(Collectors.toList());
        List<Object[]> activeTournamentsRows = tournamentTeamRepository.findActiveTournamentsForTeamIds(teamIds);
        Map<UUID, List<TeamResponse.TournamentSummary>> tournamentsByTeamId = new HashMap<>();
        for (Object[] row : activeTournamentsRows) {
            UUID teamId = (UUID) row[0];
            com.athleticaos.backend.entities.Tournament t = (com.athleticaos.backend.entities.Tournament) row[1];
            if (teamId != null && t != null) {
                tournamentsByTeamId
                        .computeIfAbsent(teamId, k -> new ArrayList<>())
                        .add(TeamResponse.TournamentSummary.builder()
                                .id(t.getId())
                                .name(t.getName())
                                .build());
            }
        }

        return teams.stream()
                .map(t -> mapToResponse(t, tournamentsByTeamId.getOrDefault(t.getId(), List.of())))
                .collect(Collectors.toList());
    }

    private static int clampPageSize(Integer size) {
        if (size == null) {
            return 24;
        }
        return Math.max(1, Math.min(100, size));
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.team.TeamOptionDTO> getTeamOptions(UUID organisationId) {
        java.util.Set<UUID> accessibleIds = userService.getAccessibleOrgIdsForCurrentUser();
        java.util.Set<UUID> targetIds = new java.util.HashSet<>();
        List<Team> teams;

        if (organisationId != null) {
            // If filtering by specific org, ensure we fetch its hierarchy
            targetIds = resolveOrganisationHierarchy(organisationId);

            // Security check: Ensure requested org is within user's accessible scope
            if (accessibleIds != null) {
                targetIds.retainAll(accessibleIds);
            }

            if (targetIds.isEmpty()) {
                return java.util.Collections.emptyList();
            }
            teams = teamRepository.findByOrganisation_IdInWithOrganisation(targetIds);
        } else {
            // No filter, use user's full scope
            if (accessibleIds != null) {
                targetIds.addAll(accessibleIds);
                if (targetIds.isEmpty()) {
                    return java.util.Collections.emptyList();
                }
                teams = teamRepository.findByOrganisation_IdInWithOrganisation(targetIds);
            } else {
                // Super Admin with no filter -> All teams
                teams = teamRepository.findAllWithOrganisation();
            }
        }

        return teams.stream()
                .map(t -> com.athleticaos.backend.dtos.team.TeamOptionDTO.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .shortName(t.getShortName())
                        .organisationId(t.getOrganisation() != null ? t.getOrganisation().getId() : null)
                        .category(t.getCategory())
                        .build())
                .sorted(java.util.Comparator.comparing(
                        com.athleticaos.backend.dtos.team.TeamOptionDTO::getName,
                        java.util.Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
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

    @Override
    @Transactional(readOnly = true)
    public TeamResponse getTeamByIdInScope(UUID id) {
        Team team = teamRepository.findById(java.util.Objects.requireNonNull(id, "ID must not be null"))
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team record outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found");
        }
        return mapToResponse(team);
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponse getTeamBySlugInScope(String slug) {
        log.info("Fetching team by slug in scope: {}", slug);
        Team team = teamRepository.findBySlug(java.util.Objects.requireNonNull(slug, "Slug must not be null"))
                .orElseThrow(() -> new EntityNotFoundException("Team not found with slug: " + slug));
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team record outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found with slug: " + slug);
        }
        return mapToResponse(team);
    }

    @Transactional
    public TeamResponse createTeam(TeamCreateRequest request, HttpServletRequest httpRequest) {
        log.info("Creating team: {}", request.getName());
        Organisation org = organisationRepository.findById(request.getOrganisationId())
                .orElseThrow(() -> new EntityNotFoundException("Organisation not found"));

        if (!accessScopeService.isOrganisationInScope(org.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for organisation outside accessible scope: userId={}, organisationId={}",
                    currentUserId, org.getId());
            throw new EntityNotFoundException("Organisation not found");
        }

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
        List<TeamResponse.TournamentSummary> tournamentsList = tournamentTeamRepository
                .findActiveTournamentsByTeamId(team.getId()).stream()
                .map(t -> TeamResponse.TournamentSummary.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .build())
                .collect(Collectors.toList());

        return mapToResponse(team, tournamentsList);
    }

    private TeamResponse mapToResponse(Team team, List<TeamResponse.TournamentSummary> tournamentsList) {
        return TeamResponse.builder()
                .id(team.getId())
                .organisationId(team.getOrganisation() != null ? team.getOrganisation().getId() : null)
                .organisationName(team.getOrganisation() != null ? team.getOrganisation().getName() : null)
                .slug(team.getSlug())
                .name(team.getName())
                .shortName(team.getShortName())
                .category(team.getCategory())
                .ageGroup(team.getAgeGroup())
                .division(team.getDivision())
                .level(team.getOrganisation() != null && team.getOrganisation().getOrgLevel() != null ? team.getOrganisation().getOrgLevel().name() : null)
                .organisationLevel(team.getOrganisation() != null && team.getOrganisation().getOrgLevel() != null ? team.getOrganisation().getOrgLevel().name() : null)
                .state(team.getState())
                .status(team.getStatus())
                .logoUrl(UrlSanitizer.sanitize(team.getLogoUrl() != null ? team.getLogoUrl() : (team.getOrganisation() != null ? team.getOrganisation().getLogoUrl() : null)))
                .players(playerTeamService.getTeamRoster(team.getId(), null))
                .tournaments(tournamentsList)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> getPlayersByTeam(UUID teamId, UUID tournamentId) {
        return playerTeamService.getTeamRoster(teamId, tournamentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> getPlayersByTeamInScope(UUID teamId, UUID tournamentId) {
        if (teamId == null) {
            return java.util.Collections.emptyList();
        }
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) {
            return java.util.Collections.emptyList();
        }
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team players outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            return java.util.Collections.emptyList();
        }
        return playerTeamService.getTeamRoster(teamId, tournamentId);
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
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team record outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found");
        }
        Person person = personRepository.findById(request.getPersonId())
                .orElseThrow(() -> new EntityNotFoundException("Person not found"));
        if (!accessScopeService.isPersonInScope(person.getId())) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for person record outside accessible organisation scope: userId={}, personId={}",
                    currentUserId, person.getId());
            throw new EntityNotFoundException("Person not found");
        }
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
        auditLogger.logTeamStaffAdded(teamStaff, httpRequest);
        
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
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team record outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found");
        }
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
                        .registrationNo(p.getRegistrationNo())
                        .firstName(p.getFirstName())
                        .lastName(p.getLastName())
                        .email(p.getEmail())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.athleticaos.backend.dtos.team.PersonSummaryDTO> getAvailablePersonsForStaffInScope(UUID teamId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("Team not found"));
        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team available staff outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found");
        }
        UUID orgId = team.getOrganisation().getId();

        return organisationPersonRepository.findByOrganisationIdOrHierarchy(orgId).stream()
                .map(op -> op.getPerson())
                .map(p -> com.athleticaos.backend.dtos.team.PersonSummaryDTO.builder()
                        .id(p.getId().toString())
                        .registrationNo(p.getRegistrationNo())
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

        if (!accessScopeService.isTeamInScope(team)) {
            UUID currentUserId = accessScopeService.getCurrentUserId();
            log.warn("Access denied for team record outside accessible organisation scope: userId={}, teamId={}",
                    currentUserId, team.getId());
            throw new EntityNotFoundException("Team not found");
        }

        teamRepository.delete(team);
        auditLogger.logTeamDeleted(team, httpRequest);
    }
}

