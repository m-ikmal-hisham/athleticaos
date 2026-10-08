package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.dtos.public_api.*;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.repositories.spec.PublicDirectorySpecifications;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.TeamService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.athleticaos.backend.repositories.PlayerTeamRepository;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class PublicProfileController {

    private final TeamService teamService;
    private final PlayerService playerService;
    private final PlayerTeamRepository playerTeamRepository;
    private final com.athleticaos.backend.repositories.MatchLineupRepository matchLineupRepository;
    private final com.athleticaos.backend.services.StatisticsService statisticsService;
    private final com.athleticaos.backend.repositories.TournamentTeamRepository tournamentTeamRepository;
    private final com.athleticaos.backend.services.PlayerTeamService playerTeamService;
    private final com.athleticaos.backend.repositories.TournamentPlayerRepository tournamentPlayerRepository;
    private final com.athleticaos.backend.repositories.TeamRepository teamRepository;
    private final com.athleticaos.backend.repositories.PlayerRepository playerRepository;

    private static final int DEFAULT_PAGE_SIZE = 24;
    private static final int MAX_PAGE_SIZE = 100;

    // ------------------------------------------------------------------
    // Teams directory
    // ------------------------------------------------------------------

    /** Unpaged (legacy) form: the whole filtered list as a JSON array. Kept for existing callers. */
    @GetMapping(value = "/teams", params = "!page")
    public ResponseEntity<List<PublicTeamSummaryResponse>> getPublicTeams(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String state) {
        List<Team> teams;
        if (tournamentId != null) {
            var ttList = tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(tournamentId);
            teams = ttList.stream()
                    .filter(tt -> tt != null && tt.getTeam() != null && tt.isActive() && !tt.isDeleted())
                    .map(tt -> tt.getTeam())
                    .distinct()
                    .collect(Collectors.toList());
        } else {
            teams = teamRepository.findAllActiveWithOrganisation();
        }

        var stream = teams.stream();

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase().trim();
            stream = stream.filter(t -> 
                (t.getName() != null && t.getName().toLowerCase().contains(q)) ||
                (t.getShortName() != null && t.getShortName().toLowerCase().contains(q)) ||
                (t.getOrganisation() != null && t.getOrganisation().getName() != null && t.getOrganisation().getName().toLowerCase().contains(q)) ||
                (t.getState() != null && t.getState().toLowerCase().contains(q))
            );
        }

        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            stream = stream.filter(t -> t.getCategory() != null && t.getCategory().equalsIgnoreCase(category));
        }

        if (state != null && !state.isBlank() && !"all".equalsIgnoreCase(state)) {
            stream = stream.filter(t -> t.getState() != null && t.getState().equalsIgnoreCase(state));
        }

        List<Team> filteredTeams = stream.collect(Collectors.toList());

        // Unpaged list covers (almost) every team, so load the extras for all teams at once.
        Map<UUID, Integer> playerCountMap = toCountMap(safeRows(
                playerTeamRepository::countActivePlayersGroupedByTeam, "Error batch counting players by team"));
        Map<UUID, List<PublicTeamDetailResponse.TournamentSummary>> tournamentsByTeamMap = toTournamentMap(safeRows(
                tournamentTeamRepository::findActiveTournamentsGroupedByTeam, "Error batch fetching tournaments by team"));

        return PublicHttpCache.ok(mapTeams(filteredTeams, playerCountMap, tournamentsByTeamMap));
    }

    /** Paged form, selected when the request has a {@code page} parameter. Filtering and paging run in the database. */
    @GetMapping(value = "/teams", params = "page")
    public ResponseEntity<PublicPageResponse<PublicTeamSummaryResponse>> getPublicTeamsPage(
            @RequestParam int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String sort) {
        // Only "name" exists for teams today; the parameter is accepted so the client can send it.
        Page<Team> result = teamRepository.findAll(
                PublicDirectorySpecifications.publicTeams(search, category, state, tournamentId),
                pageRequest(page, size));

        return PublicHttpCache.ok(PublicPageResponse.of(result, teams -> {
            if (teams.isEmpty()) {
                return List.of();
            }
            List<UUID> ids = teams.stream().map(Team::getId).collect(Collectors.toList());
            Map<UUID, Integer> playerCountMap = toCountMap(safeRows(
                    () -> playerTeamRepository.countActivePlayersGroupedByTeamIds(ids),
                    "Error batch counting players by team"));
            Map<UUID, List<PublicTeamDetailResponse.TournamentSummary>> tournamentsByTeamMap = toTournamentMap(safeRows(
                    () -> tournamentTeamRepository.findActiveTournamentsGroupedByTeamIds(ids),
                    "Error batch fetching tournaments by team"));
            return mapTeams(teams, playerCountMap, tournamentsByTeamMap);
        }));
    }

    /** Dropdown options for the teams directory. Literal path, so it wins over /teams/{idOrSlug}. */
    @GetMapping("/teams/filters")
    public ResponseEntity<PublicTeamFiltersResponse> getPublicTeamFilters() {
        return PublicHttpCache.ok(new PublicTeamFiltersResponse(
                cleanOptions(teamRepository.findDistinctStatesOfActiveTeams()),
                cleanOptions(teamRepository.findDistinctCategoriesOfActiveTeams())));
    }

    private List<PublicTeamSummaryResponse> mapTeams(
            List<Team> teams,
            Map<UUID, Integer> playerCountMap,
            Map<UUID, List<PublicTeamDetailResponse.TournamentSummary>> tournamentsByTeamMap) {
        return teams.stream().map(t -> {
            int playerCount = playerCountMap.getOrDefault(t.getId(), 0);
            List<PublicTeamDetailResponse.TournamentSummary> tournamentsList = tournamentsByTeamMap.getOrDefault(t.getId(), java.util.List.of());

            return PublicTeamSummaryResponse.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .shortName(t.getShortName())
                    .slug(t.getSlug())
                    .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(t.getLogoUrl()))
                    .category(t.getCategory())
                    .ageGroup(t.getAgeGroup())
                    .division(t.getDivision())
                    .state(t.getState())
                    .organisationName(t.getOrganisation() != null ? t.getOrganisation().getName() : null)
                    .playerCount(playerCount)
                    .tournaments(tournamentsList)
                    .build();
        }).collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Players directory
    // ------------------------------------------------------------------

    /** Unpaged (legacy) form: the whole filtered list as a JSON array, newest first. Kept for existing callers. */
    @GetMapping(value = "/players", params = "!page")
    public ResponseEntity<List<PublicPlayerListItemResponse>> getPublicPlayers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Integer limit) {
        List<Player> players;

        if (tournamentId != null) {
            var tpList = tournamentPlayerRepository.findByTournamentIdAndIsActiveTrueWithPlayerAndPerson(tournamentId);
            players = tpList.stream()
                    .filter(tp -> tp != null && tp.getPlayer() != null && !Boolean.TRUE.equals(tp.getPlayer().getDeleted()))
                    .map(tp -> tp.getPlayer())
                    .distinct()
                    .collect(Collectors.toList());
        } else if (teamId != null) {
            players = playerTeamRepository.findPlayersByTeamId(teamId).stream()
                    .filter(p -> p != null && !Boolean.TRUE.equals(p.getDeleted()))
                    .collect(Collectors.toList());
        } else {
            players = playerRepository.findAllWithPersonByDeletedFalseOrderByCreatedAtDesc();
        }

        var stream = players.stream();

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase().trim();
            stream = stream.filter(p -> {
                if (p.getPerson() != null) {
                    String fullName = (p.getPerson().getFirstName() + " " + p.getPerson().getLastName()).toLowerCase();
                    if (fullName.contains(q)) return true;
                }
                if (p.getSlug() != null && p.getSlug().toLowerCase().contains(q)) return true;
                return false;
            });
        }

        if (state != null && !state.isBlank() && !"all".equalsIgnoreCase(state)) {
            stream = stream.filter(p -> p.getPerson() != null && state.equalsIgnoreCase(p.getPerson().getState()));
        }

        List<Player> filteredPlayers = stream.collect(Collectors.toList());
        if (filteredPlayers.isEmpty()) {
            return PublicHttpCache.ok(java.util.List.of());
        }

        var respStream = mapPlayers(filteredPlayers).stream()
                .filter(res -> {
                    if (position != null && !position.isBlank() && !"all".equalsIgnoreCase(position)) {
                        return res.getPosition() != null && res.getPosition().equalsIgnoreCase(position);
                    }
                    return true;
                });

        if (limit != null && limit > 0) {
            respStream = respStream.limit(limit);
        }

        return PublicHttpCache.ok(respStream.collect(Collectors.toList()));
    }

    /** Paged form, selected when the request has a {@code page} parameter. Filtering and paging run in the database. */
    @GetMapping(value = "/players", params = "page")
    public ResponseEntity<PublicPageResponse<PublicPlayerListItemResponse>> getPublicPlayersPage(
            @RequestParam int page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) UUID teamId,
            @RequestParam(required = false) UUID tournamentId,
            @RequestParam(required = false) String sort) {
        Page<Player> result = playerRepository.findAll(
                PublicDirectorySpecifications.publicPlayers(search, state, position, teamId, tournamentId,
                        PublicDirectorySpecifications.PlayerSort.from(sort)),
                pageRequest(page, size));

        return PublicHttpCache.ok(PublicPageResponse.of(result, this::mapPlayers));
    }

    /** Dropdown options for the players directory. Literal path, so it wins over /players/{idOrSlug}. */
    @GetMapping("/players/filters")
    public ResponseEntity<PublicPlayerFiltersResponse> getPublicPlayerFilters() {
        return PublicHttpCache.ok(new PublicPlayerFiltersResponse(
                cleanOptions(playerRepository.findDistinctStatesOfActivePlayers()),
                cleanOptions(playerTeamRepository.findDistinctActivePositions())));
    }

    /**
     * Maps players (person already loaded) to list items, batch-loading memberships and tournament
     * counts for exactly these players. Shared by the paged and unpaged forms so both return the
     * same item shape. A player's "primary" team is the first active PlayerTeam.
     */
    private List<PublicPlayerListItemResponse> mapPlayers(List<Player> players) {
        if (players.isEmpty()) {
            return List.of();
        }
        List<UUID> playerIds = players.stream()
                .filter(p -> p != null && p.getId() != null)
                .map(p -> p.getId())
                .collect(Collectors.toList());

        // 1. Batch query active PlayerTeam memberships
        Map<UUID, com.athleticaos.backend.entities.PlayerTeam> primaryTeamMap = new java.util.HashMap<>();
        try {
            var ptList = playerTeamRepository.findByPlayerIdInAndIsActiveTrue(playerIds);
            if (ptList != null) {
                for (var pt : ptList) {
                    if (pt != null && pt.getPlayer() != null) {
                        primaryTeamMap.putIfAbsent(pt.getPlayer().getId(), pt);
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Error batch querying player teams", ex);
        }

        // 2. Batch query active tournament counts
        Map<UUID, Integer> tournamentCountMap = toCountMap(safeRows(
                () -> tournamentPlayerRepository.countActiveTournamentsGroupedByPlayerIds(playerIds),
                "Error batch counting tournaments by player"));

        return players.stream()
                .map(p -> {
                    String pos = null;
                    Integer jersey = null;
                    String currentTeam = null;
                    UUID currTeamId = null;
                    String orgName = null;

                    var pt = primaryTeamMap.get(p.getId());
                    if (pt != null) {
                        pos = pt.getPosition();
                        jersey = pt.getJerseyNumber();
                        if (pt.getTeam() != null) {
                            currTeamId = pt.getTeam().getId();
                            currentTeam = pt.getTeam().getName();
                            if (pt.getTeam().getOrganisation() != null) {
                                orgName = pt.getTeam().getOrganisation().getName();
                            }
                        }
                    }

                    int tCount = tournamentCountMap.getOrDefault(p.getId(), 0);

                    return PublicPlayerListItemResponse.builder()
                            .id(p.getId())
                            .firstName(p.getPerson() != null ? p.getPerson().getFirstName() : "")
                            .lastName(p.getPerson() != null ? p.getPerson().getLastName() : "")
                            .slug(p.getSlug())
                            .position(pos)
                            .jerseyNumber(jersey)
                            .currentTeamName(currentTeam)
                            .currentTeamId(currTeamId)
                            .organisationName(orgName)
                            .profilePictureUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(p.getPhotoUrl()))
                            .state(p.getPerson() != null ? p.getPerson().getState() : null)
                            .gender(p.getPerson() != null ? p.getPerson().getGender() : null)
                            .tournamentCount(tCount)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Directory helpers
    // ------------------------------------------------------------------

    /** Unsorted page request (the specification sets ORDER BY); page clamped to ≥ 0, size to 1–100 (default 24). */
    static PageRequest pageRequest(int page, Integer size) {
        int safeSize = size == null ? DEFAULT_PAGE_SIZE : Math.max(1, Math.min(MAX_PAGE_SIZE, size));
        return PageRequest.of(Math.max(0, page), safeSize);
    }

    /** Distinct (case-insensitive), non-blank, trimmed, sorted. */
    static List<String> cleanOptions(List<String> raw) {
        if (raw == null) {
            return List.of();
        }
        java.util.TreeSet<String> unique = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        for (String value : raw) {
            if (value != null && !value.isBlank()) {
                unique.add(value.trim());
            }
        }
        return new java.util.ArrayList<>(unique);
    }

    private List<Object[]> safeRows(java.util.function.Supplier<List<Object[]>> query, String errorMessage) {
        try {
            List<Object[]> rows = query.get();
            return rows != null ? rows : List.of();
        } catch (Exception ex) {
            log.debug(errorMessage, ex);
            return List.of();
        }
    }

    private static Map<UUID, Integer> toCountMap(List<Object[]> rows) {
        Map<UUID, Integer> counts = new java.util.HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                counts.put((UUID) row[0], ((Number) row[1]).intValue());
            }
        }
        return counts;
    }

    private static Map<UUID, List<PublicTeamDetailResponse.TournamentSummary>> toTournamentMap(List<Object[]> rows) {
        Map<UUID, List<PublicTeamDetailResponse.TournamentSummary>> byTeam = new java.util.HashMap<>();
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                UUID tId = (UUID) row[0];
                com.athleticaos.backend.entities.Tournament tr = (com.athleticaos.backend.entities.Tournament) row[1];
                byTeam.computeIfAbsent(tId, k -> new java.util.ArrayList<>()).add(
                        PublicTeamDetailResponse.TournamentSummary.builder()
                                .id(tr.getId())
                                .name(tr.getName())
                                .status(tr.getStatus() != null ? tr.getStatus().name() : null)
                                .build()
                );
            }
        }
        return byTeam;
    }

    @GetMapping("/teams/{idOrSlug}")
    public ResponseEntity<PublicTeamDetailResponse> getPublicTeam(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID tournamentId) {
        try {
            TeamResponse team = fetchTeam(idOrSlug);
            
            List<com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO> teamRoster = playerTeamService.getTeamRoster(team.getId(), tournamentId);
            
            List<PublicPlayerSummary> players = teamRoster != null ? 
                teamRoster.stream().map(p -> PublicPlayerSummary.builder()
                    .id(p.getPlayerId())
                    .firstName(p.getFirstName())
                    .lastName(p.getLastName())
                    .position(p.getPosition())
                    .jerseyNumber(p.getJerseyNumber())
                    .tries(p.getTries())
                    .conversions(p.getConversions())
                    .penalties(p.getPenalties())
                    .dropGoals(p.getDropGoals())
                    .yellowCards(p.getYellowCards())
                    .redCards(p.getRedCards())
                    .appearances(p.getAppearances())
                    .build()
                ).collect(Collectors.toList()) : List.of();

            List<PublicTeamDetailResponse.TournamentSummary> tournamentsList = tournamentTeamRepository
                .findActiveTournamentsByTeamId(team.getId()).stream()
                .map(t -> PublicTeamDetailResponse.TournamentSummary.builder()
                    .id(t.getId())
                    .name(t.getName())
                    .status(t.getStatus() != null ? t.getStatus().name() : null)
                    .build())
                .collect(Collectors.toList());
                
            PublicTeamDetailResponse response = PublicTeamDetailResponse.builder()
                    .id(team.getId())
                    .name(team.getName())
                    .shortName(team.getShortName())
                    .slug(team.getSlug())
                    .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(team.getLogoUrl()))
                    .category(team.getCategory())
                    .ageGroup(team.getAgeGroup())
                    .division(team.getDivision())
                    .state(team.getState())
                    .organisationName(team.getOrganisationName())
                    .players(players)
                    .tournaments(tournamentsList)
                    .build();
                    
            return ResponseEntity.ok(response);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/players/{idOrSlug}")
    public ResponseEntity<PublicPlayerDetailResponse> getPublicPlayer(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID tournamentId) {
        try {
            PlayerResponse player = fetchPlayer(idOrSlug);
            
            // Resolve position from player-team assignment
            String position = null;
            String position2 = null;
            UUID currentTeamId = null;
            Integer jerseyNumber = null;
            String currentTeamName = null;
            String organisationName = player.organisationName(); // Default from player registration

            try {
                var playerTeams = playerTeamRepository.findByPlayerIdAndIsActiveTrue(player.id());
                if (playerTeams != null && !playerTeams.isEmpty()) {
                    var primaryTeam = playerTeams.get(0);
                    position = primaryTeam.getPosition();
                    jerseyNumber = primaryTeam.getJerseyNumber();
                    // Default from player-team registration
                    currentTeamId = primaryTeam.getTeam() != null ? primaryTeam.getTeam().getId() : null;
                    currentTeamName = primaryTeam.getTeam() != null ? primaryTeam.getTeam().getName() : null;
                }
            } catch (Exception ex) {
                log.debug("Could not fetch player teams for {}", player.id(), ex);
            }

            // If a specific tournament is selected, prioritize tournament roster / lineups for that tournament
            if (tournamentId != null) {
                try {
                    var tpOpt = tournamentPlayerRepository.findByPlayerIdAndIsActiveTrue(player.id()).stream()
                            .filter(tp -> tp.getTournament() != null && tournamentId.equals(tp.getTournament().getId()))
                            .findFirst();
                    if (tpOpt.isPresent()) {
                        var tp = tpOpt.get();
                        if (tp.getTeam() != null) {
                            currentTeamId = tp.getTeam().getId();
                            currentTeamName = tp.getTeam().getName();
                            if (tp.getTeam().getOrganisation() != null) {
                                organisationName = tp.getTeam().getOrganisation().getName();
                            }
                        }
                        if (tp.getTournamentJerseyNumber() != null) {
                            jerseyNumber = tp.getTournamentJerseyNumber();
                        }
                        if (tp.getPosition() != null && !tp.getPosition().isBlank()) {
                            position = tp.getPosition();
                        }
                    }
                } catch (Exception ex) {
                    log.debug("Could not resolve tournament player details for {}", player.id(), ex);
                }

                try {
                    var tournamentLineup = matchLineupRepository.findByPlayerId(player.id()).stream()
                            .filter(l -> l.getMatch() != null && l.getMatch().getTournament() != null
                                    && tournamentId.equals(l.getMatch().getTournament().getId()))
                            .findFirst()
                            .orElse(null);
                    if (tournamentLineup != null) {
                        if (tournamentLineup.getTeam() != null) {
                            currentTeamId = tournamentLineup.getTeam().getId();
                            currentTeamName = tournamentLineup.getTeam().getName();
                            if (tournamentLineup.getTeam().getOrganisation() != null) {
                                organisationName = tournamentLineup.getTeam().getOrganisation().getName();
                            }
                        }
                        if (tournamentLineup.getJerseyNumber() != null) {
                            jerseyNumber = tournamentLineup.getJerseyNumber();
                        }
                        if (tournamentLineup.getPositionDisplay() != null && !tournamentLineup.getPositionDisplay().isBlank()) {
                            position = tournamentLineup.getPositionDisplay();
                        }
                    }
                } catch (Exception ex) {
                    log.debug("Could not resolve tournament lineup details for {}", player.id(), ex);
                }
            } else {
                // Determine the "active" team from match lineups, prioritizing
                // active (LIVE/PUBLISHED) tournaments over completed ones.
                try {
                    var lineups = matchLineupRepository.findByPlayerId(player.id());
                    if (lineups != null && !lineups.isEmpty()) {
                        var activeLineup = lineups.stream()
                                .filter(l -> l.getMatch() != null && l.getMatch().getTournament() != null)
                                .filter(l -> {
                                    var status = l.getMatch().getTournament().getStatus();
                                    return status == com.athleticaos.backend.enums.TournamentStatus.LIVE
                                            || status == com.athleticaos.backend.enums.TournamentStatus.PUBLISHED;
                                })
                                .sorted((l1, l2) -> {
                                    var s1 = l1.getMatch().getTournament().getStatus();
                                    var s2 = l2.getMatch().getTournament().getStatus();
                                    if (s1 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s2 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return -1;
                                    if (s2 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s1 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return 1;
                                    var d1 = l1.getMatch().getMatchDate();
                                    var d2 = l2.getMatch().getMatchDate();
                                    if (d1 == null || d2 == null) return 0;
                                    return d2.compareTo(d1);
                                })
                                .findFirst()
                                .orElse(null);

                        if (activeLineup != null) {
                            currentTeamId = activeLineup.getTeam().getId();
                            currentTeamName = activeLineup.getTeam().getName();
                            if (activeLineup.getTeam().getOrganisation() != null) {
                                organisationName = activeLineup.getTeam().getOrganisation().getName();
                            }
                        } else {
                            var mostRecentLineup = lineups.stream()
                                    .filter(l -> l.getMatch() != null && l.getMatch().getMatchDate() != null)
                                    .sorted((l1, l2) -> l2.getMatch().getMatchDate().compareTo(l1.getMatch().getMatchDate()))
                                    .findFirst()
                                    .orElse(null);
                            if (mostRecentLineup != null) {
                                currentTeamId = mostRecentLineup.getTeam().getId();
                                currentTeamName = mostRecentLineup.getTeam().getName();
                                if (mostRecentLineup.getTeam().getOrganisation() != null) {
                                    organisationName = mostRecentLineup.getTeam().getOrganisation().getName();
                                }
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Could not determine active team from lineups for {}: {}", player.id(), ex.getMessage());
                }
            }

            // Final fallback: use first team name from player response
            if (currentTeamName == null && player.teamNames() != null && !player.teamNames().isEmpty()) {
                currentTeamName = player.teamNames().get(0);
            }

            // Build tournament participation list for this player
            java.util.Map<UUID, PublicTeamDetailResponse.TournamentSummary> tournamentMap = new java.util.LinkedHashMap<>();
            try {
                var tpTournaments = tournamentPlayerRepository.findActiveTournamentsByPlayerId(player.id());
                if (tpTournaments != null) {
                    for (var t : tpTournaments) {
                        if (t != null && t.getId() != null && !tournamentMap.containsKey(t.getId())) {
                            tournamentMap.put(t.getId(), PublicTeamDetailResponse.TournamentSummary.builder()
                                    .id(t.getId())
                                    .name(t.getName())
                                    .status(t.getStatus() != null ? t.getStatus().name() : null)
                                    .build());
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("Error fetching tournament players for {}", player.id(), ex);
            }

            try {
                var lineups = matchLineupRepository.findByPlayerId(player.id());
                if (lineups != null) {
                    for (var l : lineups) {
                        if (l.getMatch() != null && l.getMatch().getTournament() != null) {
                            var t = l.getMatch().getTournament();
                            if (t.getId() != null && !tournamentMap.containsKey(t.getId())) {
                                tournamentMap.put(t.getId(), PublicTeamDetailResponse.TournamentSummary.builder()
                                        .id(t.getId())
                                        .name(t.getName())
                                        .status(t.getStatus() != null ? t.getStatus().name() : null)
                                        .build());
                            }
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("Error fetching tournament lineups for {}", player.id(), ex);
            }

            List<PublicTeamDetailResponse.TournamentSummary> tournamentsList = new java.util.ArrayList<>(tournamentMap.values());
            
            PublicPlayerDetailResponse response = PublicPlayerDetailResponse.builder()
                    .id(player.id())
                    .firstName(player.firstName())
                    .lastName(player.lastName())
                    .age(player.dob() != null ? Period.between(player.dob(), LocalDate.now()).getYears() : null)
                    .gender(player.gender())
                    .country(player.country())
                    .state(player.state())
                    .city(player.city())
                    .position(position)
                    .position2(position2)
                    .jerseyNumber(jerseyNumber)
                    .organisationName(organisationName)
                    .profilePictureUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(player.photoUrl()))
                    .currentTeamName(currentTeamName)
                    .currentTeamId(currentTeamId)
                    .tournaments(tournamentsList)
                    .build();
                    
            return ResponseEntity.ok(response);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private TeamResponse fetchTeam(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return teamService.getTeamById(uuid);
        } catch (IllegalArgumentException e) {
            return teamService.getTeamBySlug(idOrSlug);
        }
    }

    @GetMapping("/players/{idOrSlug}/stats")
    public ResponseEntity<?> getPublicPlayerStats(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID tournamentId) {
        try {
            PlayerResponse player = fetchPlayer(idOrSlug);
            var stats = statisticsService.getPlayerStats(player.id(), tournamentId);
            if (stats == null) {
                return ResponseEntity.ok(java.util.Map.of(
                    "matchesPlayed", 0, "tries", 0, "conversions", 0,
                    "penalties", 0, "dropGoals", 0, "yellowCards", 0,
                    "redCards", 0, "totalPoints", 0, "totalMinutesPlayed", 0,
                    "recentMatches", java.util.List.of()
                ));
            }
            return ResponseEntity.ok(stats);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching public player stats", e);
            return ResponseEntity.ok(java.util.Map.of(
                "matchesPlayed", 0, "tries", 0, "conversions", 0,
                "penalties", 0, "dropGoals", 0, "yellowCards", 0,
                "redCards", 0, "totalPoints", 0, "totalMinutesPlayed", 0,
                "recentMatches", java.util.List.of()
            ));
        }
    }

    @GetMapping("/teams/{idOrSlug}/stats")
    public ResponseEntity<?> getPublicTeamStats(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID tournamentId) {
        try {
            TeamResponse team = fetchTeam(idOrSlug);
            var stats = statisticsService.getTeamStats(team.getId(), tournamentId);
            if (stats == null) {
                return ResponseEntity.ok(java.util.Map.of(
                    "matchesPlayed", 0, "wins", 0, "draws", 0, "losses", 0,
                    "pointsFor", 0, "pointsAgainst", 0, "triesScored", 0,
                    "yellowCards", 0, "redCards", 0
                ));
            }
            return ResponseEntity.ok(stats);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error fetching public team stats {}", idOrSlug, e);
            return ResponseEntity.ok(java.util.Map.of(
                "matchesPlayed", 0, "wins", 0, "draws", 0, "losses", 0,
                "pointsFor", 0, "pointsAgainst", 0, "triesScored", 0,
                "yellowCards", 0, "redCards", 0
            ));
        }
    }

    private PlayerResponse fetchPlayer(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return playerService.getPlayerById(uuid);
        } catch (IllegalArgumentException e) {
            return playerService.getPlayerBySlug(idOrSlug);
        }
    }
}
