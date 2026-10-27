package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.dtos.public_api.PublicOrganisationDetailResponse;
import com.athleticaos.backend.dtos.public_api.PublicOrganisationRef;
import com.athleticaos.backend.dtos.public_api.PublicOrganisationTreeResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PlayerTeamRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.utils.URLUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/organisations")
@RequiredArgsConstructor
@Slf4j
public class PublicOrganisationController {

    private final OrganisationRepository organisationRepository;
    private final TeamRepository teamRepository;
    private final PlayerTeamRepository playerTeamRepository;
    private final TournamentRepository tournamentRepository;

    /**
     * Reusable public organisation rule:
     * Active (case-insensitive) and not deleted.
     */
    public static boolean isOrganisationPublic(Organisation org) {
        if (org == null) {
            return false;
        }
        if (org.isDeleted()) {
            return false;
        }
        return org.getStatus() == null || "active".equalsIgnoreCase(org.getStatus());
    }

    /**
     * Reusable public team rule:
     * Team active and not deleted (if column existed), and its organisation is public.
     */
    public static boolean isTeamPublic(Team team) {
        if (team == null) {
            return false;
        }
        if (team.getStatus() != null && "inactive".equalsIgnoreCase(team.getStatus())) {
            return false;
        }
        return isOrganisationPublic(team.getOrganisation());
    }

    /**
     * Build parent chain upward starting from an organisation's parent.
     * Stops at first non-public parent, guards against cycles, depth <= 10.
     * Returns nearest parent first.
     *
     * Walks by parent id through publicOrgsById (all public organisations, loaded in one query) rather than
     * through getParentOrg(): beyond the first level the parent is an uninitialised proxy, and with
     * open-in-view off there is no session to load it here.
     */
    public static List<PublicOrganisationRef> buildParentChain(Organisation startOrg, Map<UUID, Organisation> publicOrgsById) {
        List<PublicOrganisationRef> chain = new ArrayList<>();
        if (startOrg == null) {
            return chain;
        }

        Set<UUID> visited = new HashSet<>();
        if (startOrg.getId() != null) {
            visited.add(startOrg.getId());
        }

        UUID parentId = parentIdOf(startOrg);
        int depth = 0;
        while (parentId != null && depth < 10) {
            Organisation curr = publicOrgsById.get(parentId);
            if (curr == null || !isOrganisationPublic(curr)) {
                break;
            }
            if (!visited.add(curr.getId())) {
                // Cycle detected
                break;
            }
            chain.add(toRef(curr));
            parentId = parentIdOf(curr);
            depth++;
        }

        return chain;
    }

    /** All public organisations by id, parents fetched (one query). */
    public static Map<UUID, Organisation> loadPublicOrgsById(OrganisationRepository organisationRepository) {
        return organisationRepository.findAllActiveNonDeletedWithParentOrg().stream()
                .filter(PublicOrganisationController::isOrganisationPublic)
                .collect(Collectors.toMap(Organisation::getId, o -> o, (a, b) -> a));
    }

    // Reading the id of a (possibly uninitialised) parent proxy does not need a session.
    private static UUID parentIdOf(Organisation org) {
        return org.getParentOrg() != null ? org.getParentOrg().getId() : null;
    }

    public static PublicOrganisationRef toRef(Organisation org) {
        if (org == null) {
            return null;
        }
        return PublicOrganisationRef.builder()
                .id(org.getId())
                .slug(org.getSlug())
                .name(org.getName())
                .level(org.getOrgLevel())
                .logoUrl(URLUtils.makeAbsolute(org.getLogoUrl()))
                .primaryColor(org.getPrimaryColor())
                .secondaryColor(org.getSecondaryColor())
                .build();
    }

    @GetMapping("/tree")
    public ResponseEntity<PublicOrganisationTreeResponse> getOrganisationTree() {
        // 1. Fetch all active, non-deleted organisations
        List<Organisation> allActiveOrgs = organisationRepository.findAllActiveNonDeletedWithParentOrg();

        // Index of all public organisations by ID
        Map<UUID, Organisation> publicOrgMap = allActiveOrgs.stream()
                .filter(PublicOrganisationController::isOrganisationPublic)
                .collect(Collectors.toMap(Organisation::getId, o -> o, (a, b) -> a));

        // 2. Fetch all active teams with their organisation
        List<Team> allTeams = teamRepository.findAllActiveWithOrganisation();
        List<Team> publicTeams = allTeams.stream()
                .filter(t -> t.getOrganisation() != null && publicOrgMap.containsKey(t.getOrganisation().getId()))
                .filter(PublicOrganisationController::isTeamPublic)
                .collect(Collectors.toList());

        // 3. Batch count players grouped by team
        Map<UUID, Integer> playerCountByTeam = new HashMap<>();
        try {
            List<Object[]> rows = playerTeamRepository.countActivePlayersGroupedByTeam();
            if (rows != null) {
                for (Object[] row : rows) {
                    if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                        playerCountByTeam.put((UUID) row[0], ((Number) row[1]).intValue());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Error batch counting active players by team", e);
        }

        // Count direct public teams per organisation
        Map<UUID, Integer> teamCountByOrg = new HashMap<>();
        for (Team t : publicTeams) {
            UUID orgId = t.getOrganisation().getId();
            teamCountByOrg.put(orgId, teamCountByOrg.getOrDefault(orgId, 0) + 1);
        }

        // Count direct public children per organisation
        Map<UUID, Integer> childCountByOrg = new HashMap<>();
        for (Organisation org : publicOrgMap.values()) {
            Organisation parent = org.getParentOrg();
            // Parent must be public to be counted as child of that parent
            if (parent != null && parent.getId() != null && publicOrgMap.containsKey(parent.getId())) {
                childCountByOrg.put(parent.getId(), childCountByOrg.getOrDefault(parent.getId(), 0) + 1);
            }
        }

        // Build organisation nodes
        List<PublicOrganisationTreeResponse.OrganisationNode> orgNodes = publicOrgMap.values().stream()
                .map(org -> {
                    UUID parentId = null;
                    if (org.getParentOrg() != null && publicOrgMap.containsKey(org.getParentOrg().getId())) {
                        parentId = org.getParentOrg().getId();
                    }

                    return PublicOrganisationTreeResponse.OrganisationNode.builder()
                            .id(org.getId())
                            .slug(org.getSlug())
                            .name(org.getName())
                            .level(org.getOrgLevel())
                            .state(org.getState())
                            .logoUrl(URLUtils.makeAbsolute(org.getLogoUrl()))
                            .primaryColor(org.getPrimaryColor())
                            .secondaryColor(org.getSecondaryColor())
                            .parentId(parentId)
                            .teamCount(teamCountByOrg.getOrDefault(org.getId(), 0))
                            .childCount(childCountByOrg.getOrDefault(org.getId(), 0))
                            .build();
                })
                .sorted(Comparator.comparing(PublicOrganisationTreeResponse.OrganisationNode::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        // Build team nodes
        List<PublicOrganisationTreeResponse.TeamNode> teamNodes = publicTeams.stream()
                .map(t -> PublicOrganisationTreeResponse.TeamNode.builder()
                        .id(t.getId())
                        .slug(t.getSlug())
                        .name(t.getName())
                        .organisationId(t.getOrganisation().getId())
                        .category(t.getCategory())
                        .ageGroup(t.getAgeGroup())
                        .division(t.getDivision())
                        .playerCount(playerCountByTeam.getOrDefault(t.getId(), 0))
                        .logoUrl(URLUtils.makeAbsolute(t.getLogoUrl()))
                        .build())
                .sorted(Comparator.comparing(PublicOrganisationTreeResponse.TeamNode::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        PublicOrganisationTreeResponse response = PublicOrganisationTreeResponse.builder()
                .organisations(orgNodes)
                .teams(teamNodes)
                .build();

        return PublicHttpCache.okWith5MinCache(response);
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<PublicOrganisationDetailResponse> getOrganisationDetail(@PathVariable String idOrSlug) {
        Organisation org = fetchOrganisation(idOrSlug);
        if (org == null || !isOrganisationPublic(org)) {
            return ResponseEntity.notFound().build();
        }

        // Load all active non-deleted organisations to compute hierarchy and counts
        Map<UUID, Organisation> publicOrgMap = loadPublicOrgsById(organisationRepository);

        // 1. Parent chain (nearest first)
        List<PublicOrganisationRef> parentChain = buildParentChain(org, publicOrgMap);

        // 2. Direct public children
        List<Organisation> directChildren = publicOrgMap.values().stream()
                .filter(o -> o.getParentOrg() != null && org.getId().equals(o.getParentOrg().getId()))
                .sorted(Comparator.comparing(Organisation::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        // Batch count teams for direct children
        List<Team> allActiveTeams = teamRepository.findAllActiveWithOrganisation().stream()
                .filter(PublicOrganisationController::isTeamPublic)
                .collect(Collectors.toList());

        Map<UUID, Integer> teamCountByOrg = new HashMap<>();
        for (Team t : allActiveTeams) {
            if (t.getOrganisation() != null && t.getOrganisation().getId() != null) {
                UUID oid = t.getOrganisation().getId();
                teamCountByOrg.put(oid, teamCountByOrg.getOrDefault(oid, 0) + 1);
            }
        }

        Map<UUID, Integer> childCountByOrg = new HashMap<>();
        for (Organisation o : publicOrgMap.values()) {
            if (o.getParentOrg() != null && o.getParentOrg().getId() != null) {
                UUID pid = o.getParentOrg().getId();
                childCountByOrg.put(pid, childCountByOrg.getOrDefault(pid, 0) + 1);
            }
        }

        List<PublicOrganisationDetailResponse.ChildOrganisation> childrenDtos = directChildren.stream()
                .map(c -> PublicOrganisationDetailResponse.ChildOrganisation.builder()
                        .id(c.getId())
                        .slug(c.getSlug())
                        .name(c.getName())
                        .level(c.getOrgLevel())
                        .logoUrl(URLUtils.makeAbsolute(c.getLogoUrl()))
                        .primaryColor(c.getPrimaryColor())
                        .secondaryColor(c.getSecondaryColor())
                        .teamCount(teamCountByOrg.getOrDefault(c.getId(), 0))
                        .childCount(childCountByOrg.getOrDefault(c.getId(), 0))
                        .build())
                .collect(Collectors.toList());

        // 3. Direct public teams of this organisation
        List<Team> directTeams = allActiveTeams.stream()
                .filter(t -> t.getOrganisation() != null && org.getId().equals(t.getOrganisation().getId()))
                .sorted(Comparator.comparing(Team::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        List<UUID> directTeamIds = directTeams.stream().map(Team::getId).collect(Collectors.toList());
        Map<UUID, Integer> directPlayerCounts = new HashMap<>();
        if (!directTeamIds.isEmpty()) {
            try {
                List<Object[]> rows = playerTeamRepository.countActivePlayersGroupedByTeamIds(directTeamIds);
                if (rows != null) {
                    for (Object[] row : rows) {
                        if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                            directPlayerCounts.put((UUID) row[0], ((Number) row[1]).intValue());
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Error batch counting players for direct teams", e);
            }
        }

        List<PublicOrganisationTreeResponse.TeamNode> teamsDtos = directTeams.stream()
                .map(t -> PublicOrganisationTreeResponse.TeamNode.builder()
                        .id(t.getId())
                        .slug(t.getSlug())
                        .name(t.getName())
                        .organisationId(org.getId())
                        .category(t.getCategory())
                        .ageGroup(t.getAgeGroup())
                        .division(t.getDivision())
                        .playerCount(directPlayerCounts.getOrDefault(t.getId(), 0))
                        .logoUrl(URLUtils.makeAbsolute(t.getLogoUrl()))
                        .build())
                .collect(Collectors.toList());

        // 4. Tournaments organised by this organisation (isPublished == true AND deleted != true)
        List<Tournament> publishedTournaments = tournamentRepository.findPublishedByOrganiserOrgId(org.getId());
        List<PublicOrganisationDetailResponse.TournamentItem> tournamentDtos = publishedTournaments.stream()
                .map(t -> PublicOrganisationDetailResponse.TournamentItem.builder()
                        .id(t.getId())
                        .slug(t.getSlug())
                        .name(t.getName())
                        .status(t.getStatus() != null ? t.getStatus().name() : null)
                        .startDate(t.getStartDate())
                        .endDate(t.getEndDate())
                        .logoUrl(URLUtils.makeAbsolute(t.getLogoUrl()))
                        .build())
                .collect(Collectors.toList());

        // 5. Counts (descendants, teams, players, tournaments)
        Set<UUID> allDescendantOrgIds = collectDescendantOrgIds(org.getId(), publicOrgMap);
        int affiliatedOrganisationsCount = allDescendantOrgIds.size();

        Set<UUID> subtreeOrgIds = new HashSet<>(allDescendantOrgIds);
        subtreeOrgIds.add(org.getId());

        int totalSubtreeTeams = (int) allActiveTeams.stream()
                .filter(t -> t.getOrganisation() != null && subtreeOrgIds.contains(t.getOrganisation().getId()))
                .count();

        long distinctPlayersCount = 0;
        try {
            distinctPlayersCount = playerTeamRepository.countPlayersByOrganisationIds(subtreeOrgIds);
        } catch (Exception e) {
            log.debug("Error counting distinct players by subtree organisations", e);
        }

        int tournamentCount = publishedTournaments.size();

        PublicOrganisationDetailResponse.Counts counts = PublicOrganisationDetailResponse.Counts.builder()
                .affiliatedOrganisations(affiliatedOrganisationsCount)
                .teams(totalSubtreeTeams)
                .players((int) distinctPlayersCount)
                .tournaments(tournamentCount)
                .build();

        PublicOrganisationDetailResponse response = PublicOrganisationDetailResponse.builder()
                .id(org.getId())
                .slug(org.getSlug())
                .name(org.getName())
                .level(org.getOrgLevel())
                .state(org.getState())
                .logoUrl(URLUtils.makeAbsolute(org.getLogoUrl()))
                .coverImageUrl(URLUtils.makeAbsolute(org.getCoverImageUrl()))
                .primaryColor(org.getPrimaryColor())
                .secondaryColor(org.getSecondaryColor())
                .accentColor(org.getAccentColor())
                .parentChain(parentChain)
                .children(childrenDtos)
                .teams(teamsDtos)
                .tournaments(tournamentDtos)
                .counts(counts)
                .build();

        return PublicHttpCache.okWith5MinCache(response);
    }

    private Set<UUID> collectDescendantOrgIds(UUID parentId, Map<UUID, Organisation> publicOrgMap) {
        Set<UUID> descendants = new HashSet<>();
        Queue<UUID> queue = new ArrayDeque<>();
        queue.add(parentId);

        int depthGuard = 0;
        while (!queue.isEmpty() && depthGuard < 500) {
            UUID currentId = queue.poll();
            depthGuard++;

            for (Organisation candidate : publicOrgMap.values()) {
                if (candidate.getParentOrg() != null && currentId.equals(candidate.getParentOrg().getId())) {
                    if (descendants.add(candidate.getId())) {
                        queue.add(candidate.getId());
                    }
                }
            }
        }
        return descendants;
    }

    private Organisation fetchOrganisation(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return organisationRepository.findByIdWithParentOrg(uuid)
                    .orElseGet(() -> organisationRepository.findBySlugWithParentOrg(idOrSlug).orElse(null));
        } catch (IllegalArgumentException e) {
            return organisationRepository.findBySlugWithParentOrg(idOrSlug).orElse(null);
        }
    }
}
