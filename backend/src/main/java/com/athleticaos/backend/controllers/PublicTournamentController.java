package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.public_api.*;
import com.athleticaos.backend.dtos.standing.StandingsResponse;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.StandingsService;
import com.athleticaos.backend.services.TournamentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class PublicTournamentController {

    private final TournamentService tournamentService;
    private final MatchService matchService;
    private final StandingsService standingsService;
    private final com.athleticaos.backend.repositories.TournamentTeamRepository tournamentTeamRepository;
    private final com.athleticaos.backend.repositories.MatchEventRepository matchEventRepository;
    private final com.athleticaos.backend.repositories.OrganisationRepository organisationRepository;
    private final com.athleticaos.backend.services.TournamentCategoryService categoryService;
    private final com.athleticaos.backend.services.StatisticsService statisticsService;
    private final com.athleticaos.backend.repositories.MatchOfficialRepository matchOfficialRepository;
    private final com.athleticaos.backend.repositories.TournamentStageRepository stageRepository;
    private final com.athleticaos.backend.services.MatchLineupService matchLineupService;

    @GetMapping("/tournaments")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PublicTournamentSummaryResponse>> getPublicTournaments(
            @RequestParam(required = false) String seasonId,
            @RequestParam(required = false) String status) {

        // For MVP, fetching all published and filtering in memory if needed
        // In a real app, we'd pass filters to the service/repository
        List<TournamentResponse> tournaments = tournamentService.getPublishedTournaments();

        List<PublicTournamentSummaryResponse> response = tournaments.stream()
                .map(this::mapToPublicSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/tournaments/{idOrSlug}")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicTournamentDetailResponse> getTournamentDetail(@PathVariable String idOrSlug) {
        try {
            TournamentResponse tournament = fetchTournament(idOrSlug);

            if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
                return ResponseEntity.notFound().build();
            }

            PublicTournamentDetailResponse response = mapToPublicDetail(tournament);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching tournament detail for id {}", idOrSlug, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/tournaments/{idOrSlug}/matches")
    @Transactional(readOnly = true)
    public ResponseEntity<List<PublicMatchSummaryResponse>> getTournamentMatches(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) UUID categoryId) {

        try {
            // Verify tournament is published
            TournamentResponse tournament = fetchTournament(idOrSlug);
            if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
                return ResponseEntity.notFound().build();
            }

            List<MatchResponse> matches = matchService.getMatchesByTournament(tournament.getId());

            if (categoryId != null) {
                matches = matches.stream()
                        .filter(m -> m.getStage() == null || m.getStage().getCategoryId() == null ||
                                m.getStage().getCategoryId().equals(categoryId))
                        .collect(Collectors.toList());
            }

            // Fetch officials for the tournament
            List<com.athleticaos.backend.entities.MatchOfficial> allOfficials = matchOfficialRepository.findByMatch_Tournament_Id(tournament.getId());
            java.util.Map<UUID, List<com.athleticaos.backend.dtos.official.MatchOfficialDTO>> officialsByMatch = allOfficials.stream()
                .collect(Collectors.groupingBy(
                    mo -> mo.getMatch().getId(),
                    Collectors.mapping(mo -> {
                        String name = "Unknown";
                        if (mo.getOfficial() != null) {
                            if (mo.getOfficial().getPerson() != null) {
                                name = mo.getOfficial().getPerson().getFirstName() + " " + mo.getOfficial().getPerson().getLastName();
                            } else if (mo.getOfficial().getUser() != null) {
                                name = mo.getOfficial().getUser().getFirstName() + " " + mo.getOfficial().getUser().getLastName();
                            }
                        }
                        return com.athleticaos.backend.dtos.official.MatchOfficialDTO.builder()
                            .id(mo.getId())
                            .officialName(name)
                            .assignedRole(mo.getAssignedRole())
                            .officialRoleName(mo.getOfficialRole() != null ? mo.getOfficialRole().getName() : null)
                            .isConfirmed(mo.isConfirmed())
                            .build();
                    }, Collectors.toList())
                ));

            // Batch-load stage display orders to avoid N+1 queries
            java.util.Map<UUID, com.athleticaos.backend.entities.TournamentStage> stageMap = new java.util.HashMap<>();
            java.util.Set<UUID> stageIds = matches.stream()
                .filter(m -> m.getStage() != null && m.getStage().getId() != null)
                .map(m -> {
                    try { return UUID.fromString(m.getStage().getId()); }
                    catch (Exception e) { return null; }
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
            if (!stageIds.isEmpty()) {
                stageRepository.findAllById(stageIds).forEach(s -> stageMap.put(s.getId(), s));
            }

            List<PublicMatchSummaryResponse> response = matches.stream()
                    .map(m -> {
                         PublicMatchSummaryResponse summary = mapToPublicMatchSummary(m, stageMap);
                         summary.setOfficials(officialsByMatch.getOrDefault(m.getId(), List.of()));
                         return summary;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching matches for tournament {}", idOrSlug, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/matches/{idOrSlug}")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicMatchDetailResponse> getMatchDetail(@PathVariable String idOrSlug) {
        // Resolve UUID or matchCode
        UUID matchId;
        try {
            matchId = UUID.fromString(idOrSlug);
        } catch (IllegalArgumentException e) {
            // Not a UUID, try to find by matchCode
            MatchResponse matchByCode = matchService.getMatchByCode(idOrSlug);
            matchId = matchByCode.getId();
        }

        MatchResponse match = matchService.getMatchById(matchId);

        // Verify tournament is published
        TournamentResponse tournament = tournamentService.getTournamentById(match.getTournamentId());
        if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
            return ResponseEntity.notFound().build();
        }

        PublicMatchDetailResponse response = mapToPublicMatchDetail(match);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/matches/{idOrSlug}/lineups")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicMatchLineupsResponse> getMatchLineups(@PathVariable String idOrSlug) {
        try {
            // Resolve match ID
            UUID matchId;
            try {
                matchId = UUID.fromString(idOrSlug);
            } catch (IllegalArgumentException e) {
                MatchResponse matchByCode = matchService.getMatchByCode(idOrSlug);
                matchId = matchByCode.getId();
            }

            MatchResponse match = matchService.getMatchById(matchId);

            // Verify tournament is published
            TournamentResponse tournament = tournamentService.getTournamentById(match.getTournamentId());
            if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
                return ResponseEntity.notFound().build();
            }

            // Get lineups for both teams
            UUID homeTeamId = match.getHomeTeamId();
            UUID awayTeamId = match.getAwayTeamId();

            List<com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO> homeEntries =
                    matchLineupService.getLineup(matchId, homeTeamId);
            List<com.athleticaos.backend.dtos.roster.MatchLineupEntryDTO> awayEntries =
                    matchLineupService.getLineup(matchId, awayTeamId);

            PublicMatchLineupsResponse response = PublicMatchLineupsResponse.builder()
                    .homeTeamName(match.getHomeTeamName())
                    .awayTeamName(match.getAwayTeamName())
                    .homeLineup(homeEntries.stream()
                            .map(e -> PublicMatchLineupsResponse.PublicLineupEntry.builder()
                                    .playerName(e.getPlayerName())
                                    .jerseyNumber(e.getJerseyNumber())
                                    .captain(e.isCaptain())
                                    .role(e.getRole() != null ? e.getRole().name() : "STARTER")
                                    .orderIndex(e.getOrderIndex())
                                    .positionDisplay(e.getPositionDisplay())
                                    .build())
                            .collect(Collectors.toList()))
                    .awayLineup(awayEntries.stream()
                            .map(e -> PublicMatchLineupsResponse.PublicLineupEntry.builder()
                                    .playerName(e.getPlayerName())
                                    .jerseyNumber(e.getJerseyNumber())
                                    .captain(e.isCaptain())
                                    .role(e.getRole() != null ? e.getRole().name() : "STARTER")
                                    .orderIndex(e.getOrderIndex())
                                    .positionDisplay(e.getPositionDisplay())
                                    .build())
                            .collect(Collectors.toList()))
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching lineups for match {}", idOrSlug, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/tournaments/{idOrSlug}/standings")
    @Transactional(readOnly = true)
    public ResponseEntity<List<StandingsResponse>> getTournamentStandings(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID categoryId) {
        try {
            // Verify tournament is published
            TournamentResponse tournament = fetchTournament(idOrSlug);
            if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
                return ResponseEntity.notFound().build();
            }

            List<StandingsResponse> standings = standingsService.getStandings(tournament.getId());

            if (categoryId != null) {
                standings = standings.stream()
                        .filter(s -> s.getCategoryId() == null || s.getCategoryId().equals(categoryId))
                        .collect(Collectors.toList());
            }
            return ResponseEntity.ok(standings);
        } catch (Exception e) {
            log.error("Error fetching standings for tournament {}", idOrSlug, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/tournaments/{idOrSlug}/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicTournamentStatsResponse> getTournamentStats(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) UUID categoryId) {
        try {
            TournamentResponse tournament = fetchTournament(idOrSlug);
            if ("Draft".equalsIgnoreCase(tournament.getStatus())) {
                return ResponseEntity.notFound().build();
            }

            com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse leaderboard = statisticsService
                    .getTournamentLeaderboard(tournament.getId(), categoryId);
            com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse summary = statisticsService
                    .getTournamentSummary(tournament.getId(), categoryId);

            PublicTournamentStatsResponse response = mapToPublicStats(leaderboard, summary);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching stats for tournament {}", idOrSlug, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private TournamentResponse fetchTournament(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return tournamentService.getTournamentById(uuid);
        } catch (java.lang.IllegalArgumentException e) {
            return tournamentService.getTournamentBySlug(idOrSlug);
        }
    }

    // Mappers

    private PublicTournamentSummaryResponse mapToPublicSummary(TournamentResponse t) {
        return PublicTournamentSummaryResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .slug(t.getSlug())
                .level(t.getLevel())
                .seasonName(t.getSeasonName())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .venue(t.getVenue())
                .isLive("Ongoing".equalsIgnoreCase(t.getStatus()))
                .isCompleted("Completed".equalsIgnoreCase(t.getStatus()))
                .organiserName("Organiser")
                .organiserBranding(getOrganiserBranding(t.getOrganiserOrgId()))
                .competitionType(t.getCompetitionType())
                .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(t.getLogoUrl()))
                .livestreamUrl(t.getLivestreamUrl())
                .build();
    }

    private PublicTournamentDetailResponse mapToPublicDetail(TournamentResponse t) {
        // Fetch teams for this tournament with eager loading to prevent
        // LazyInitializationException
        List<PublicTeamSummary> teams = tournamentTeamRepository.findByTournamentIdWithTeamAndOrganisation(t.getId())
                .stream()
                .filter(tt -> tt.getTeam() != null) // Filter out broken references
                .map(tt -> PublicTeamSummary.builder()
                        .id(tt.getTeam().getId())
                        .name(tt.getTeam().getName())
                        .slug(tt.getTeam().getSlug())
                        .shortName(tt.getTeam().getShortName())
                        .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(
                                tt.getTeam().getLogoUrl() != null && !tt.getTeam().getLogoUrl().isBlank()
                                        ? tt.getTeam().getLogoUrl()
                                        : (tt.getTeam().getOrganisation() != null ? tt.getTeam().getOrganisation().getLogoUrl() : null)))
                        .categoryId(tt.getCategory() != null ? tt.getCategory().getId() : null)
                        .categoryName(tt.getCategory() != null ? tt.getCategory().getName() : null)
                        .build())
                .collect(Collectors.toList());

        // Fetch organiser name
        String organiserName = "Organiser";
        if (t.getOrganiserOrgId() != null) {
            try {
                @SuppressWarnings("null")
                String name = organisationRepository.findById(t.getOrganiserOrgId())
                        .map(com.athleticaos.backend.entities.Organisation::getName)
                        .orElse("Organiser");
                organiserName = name;
            } catch (Exception e) {
                // Fallback to default
            }
        }

        // Fetch categories
        List<PublicCategorySummary> categories = categoryService.getCategoriesByTournament(t.getId()).stream()
                .map(c -> PublicCategorySummary.builder()
                        .id(c.getId())
                        .name(c.getName())
                        .description(c.getDescription())
                        .build())
                .collect(Collectors.toList());

        return PublicTournamentDetailResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .slug(t.getSlug())
                .level(t.getLevel())
                .seasonName(t.getSeasonName())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .venue(t.getVenue())
                .isLive("Ongoing".equalsIgnoreCase(t.getStatus()))
                .isCompleted("Completed".equalsIgnoreCase(t.getStatus()))
                .organiserName(organiserName)
                .organiserBranding(getOrganiserBranding(t.getOrganiserOrgId()))
                .competitionType(t.getCompetitionType())
                .teams(teams)
                .categories(categories)
                .stages(List.of()) // Stages can be populated if TournamentStage is used
                .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(t.getLogoUrl()))
                .livestreamUrl(t.getLivestreamUrl())
                .build();
    }

    private PublicOrganisationBranding getOrganiserBranding(UUID organiserId) {
        if (organiserId == null)
            return null;
        return organisationRepository.findById(organiserId)
                .map(org -> PublicOrganisationBranding.builder()
                        .primaryColor(org.getPrimaryColor())
                        .secondaryColor(org.getSecondaryColor())
                        .accentColor(org.getAccentColor())
                        .logoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(org.getLogoUrl()))
                        .coverImageUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(org.getCoverImageUrl()))
                        .build())
                .orElse(null);
    }

    private PublicMatchSummaryResponse mapToPublicMatchSummary(
            MatchResponse m,
            java.util.Map<UUID, com.athleticaos.backend.entities.TournamentStage> stageMap) {
        // Use stage name from the actual TournamentStage entity if available,
        // falling back to the legacy phase field.
        String stageName = m.getPhase(); // Default to phase (legacy)
        Integer stageDisplayOrder = null;
        if (m.getStage() != null && m.getStage().getName() != null) {
            stageName = m.getStage().getName();
            try {
                UUID stageId = UUID.fromString(m.getStage().getId());
                com.athleticaos.backend.entities.TournamentStage stageEntity = stageMap.get(stageId);
                if (stageEntity != null) {
                    stageDisplayOrder = stageEntity.getDisplayOrder();
                }
            } catch (Exception ignored) {
                // If stage ID is not valid, skip display order
            }
        }

        return PublicMatchSummaryResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
                .homeTeamLogoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(m.getHomeTeamLogoUrl()))
                .awayTeamLogoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(m.getAwayTeamLogoUrl()))
                .homeTeamShortName(m.getHomeTeamShortName())
                .awayTeamShortName(m.getAwayTeamShortName())
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
                .matchTime(m.getKickOffTime())
                .venue(m.getVenue())
                .status(m.getStatus())
                .resultType(m.getResultType())
                .stage(stageName)
                .stageType(m.getStage() != null ? m.getStage().getStageType() : null)
                .stageDisplayOrder(stageDisplayOrder)
                .build();
    }

    private PublicMatchDetailResponse mapToPublicMatchDetail(MatchResponse m) {
        // Fetch match events
        List<com.athleticaos.backend.entities.MatchEvent> matchEvents = matchEventRepository.findByMatchId(m.getId());

        // Map events to public response
        List<PublicMatchEventResponse> events = matchEvents.stream()
                .map(event -> {
                    String playerName = null;
                    if (event.getPlayer() != null) {
                        com.athleticaos.backend.entities.Player player = event.getPlayer();
                        playerName = player.getPerson().getFirstName() + " " + player.getPerson().getLastName();
                    }

                    return PublicMatchEventResponse.builder()
                            .minute(event.getMinute())
                            .teamName(event.getTeam().getName())
                            .playerName(playerName)
                            .eventType(event.getEventType().name())
                            .points(statisticsService.getPointsForEventType(event.getEventType()))
                            .notes(event.getNotes())
                            .build();
                })
                .collect(Collectors.toList());

        // Calculate team stats
        PublicTeamStatsResponse homeStats = statisticsService.calculateTeamMatchStats(matchEvents, m.getHomeTeamName());
        PublicTeamStatsResponse awayStats = statisticsService.calculateTeamMatchStats(matchEvents, m.getAwayTeamName());

        // Fetch tournament to get organiser branding
        UUID tournamentId = m.getTournamentId();
        PublicOrganisationBranding branding = null;
        if (tournamentId != null) {
            TournamentResponse t = tournamentService.getTournamentById(tournamentId);
            branding = getOrganiserBranding(t.getOrganiserOrgId());
        }

        return PublicMatchDetailResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
                .homeTeamLogoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(m.getHomeTeamLogoUrl()))
                .awayTeamLogoUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(m.getAwayTeamLogoUrl()))
                .homeTeamShortName(m.getHomeTeamShortName())
                .awayTeamShortName(m.getAwayTeamShortName())
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
                .officials(matchOfficialRepository.findByMatchId(m.getId()).stream()
                    .map(mo -> {
                        String name = "Unknown";
                        if (mo.getOfficial() != null) {
                            if (mo.getOfficial().getPerson() != null) {
                                name = mo.getOfficial().getPerson().getFirstName() + " " + mo.getOfficial().getPerson().getLastName();
                            } else if (mo.getOfficial().getUser() != null) {
                                name = mo.getOfficial().getUser().getFirstName() + " " + mo.getOfficial().getUser().getLastName();
                            }
                        }
                        return com.athleticaos.backend.dtos.official.MatchOfficialDTO.builder()
                            .id(mo.getId())
                            .officialName(name)
                            .assignedRole(mo.getAssignedRole())
                            .officialRoleName(mo.getOfficialRole() != null ? mo.getOfficialRole().getName() : null)
                            .isConfirmed(mo.isConfirmed())
                            .build();
                    })
                    .collect(Collectors.toList()))
                .matchTime(m.getKickOffTime())
                .matchTime(m.getKickOffTime())
                .venue(m.getVenue())
                .status(m.getStatus())
                .stage(m.getPhase())
                .events(events)
                .homeStats(homeStats)
                .awayStats(awayStats)
                .organiserBranding(branding)
                .tournamentId(m.getTournamentId())
                .tournamentSlug(m.getTournamentSlug())
                // Populate format fields using tournament match logic
                .matchDuration(getMatchDuration(m.getTournamentId(),
                        m.getStage() != null ? m.getStage().getCategoryId() : null))
                .isOneWayMatch(getIsOneWayMatch(m.getTournamentId(),
                        m.getStage() != null ? m.getStage().getCategoryId() : null))
                .build();
    }

    private Integer getMatchDuration(UUID tournamentId, UUID categoryId) {
        if (tournamentId == null)
            return 80;
        try {
            com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO config = tournamentService
                    .getFormatConfig(tournamentId, categoryId);
            return config != null ? config.getMatchDurationMinutes() : 80;
        } catch (Exception e) {
            return 80; // default
        }
    }

    private boolean getIsOneWayMatch(UUID tournamentId, UUID categoryId) {
        if (tournamentId == null)
            return false;
        try {
            com.athleticaos.backend.dtos.tournament.TournamentFormatConfigDTO config = tournamentService
                    .getFormatConfig(tournamentId, categoryId);
            return config != null && Boolean.TRUE.equals(config.getIsOneWayMatch());
        } catch (Exception e) {
            return false;
        }
    }

    private PublicTournamentStatsResponse mapToPublicStats(
            com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse leaderboard,
            com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse summary) {
        List<PublicPlayerStatEntry> topScorers = leaderboard.topPlayers().stream()
                .map(p -> PublicPlayerStatEntry.builder()
                        .playerId(p.playerId())
                        .name(p.firstName() + " " + p.lastName())
                        .teamName(p.teamName())
                        .tries(p.tries())
                        .conversions(p.conversions())
                        .penalties(p.penalties())
                        .dropGoals(p.dropGoals())
                        .totalPoints(p.totalPoints())
                        .yellowCards(p.yellowCards())
                        .redCards(p.redCards())
                        .build())
                .collect(Collectors.toList());

        List<PublicPlayerStatEntry> topOffenders = leaderboard.topOffenders().stream()
                .map(p -> PublicPlayerStatEntry.builder()
                        .playerId(p.playerId())
                        .name(p.firstName() + " " + p.lastName())
                        .teamName(p.teamName())
                        .tries(p.tries())
                        .conversions(p.conversions())
                        .penalties(p.penalties())
                        .dropGoals(p.dropGoals())
                        .totalPoints(p.totalPoints())
                        .yellowCards(p.yellowCards())
                        .redCards(p.redCards())
                        .build())
                .collect(Collectors.toList());

        List<PublicTeamStatEntry> topTeams = leaderboard.topTeams().stream()
                .map(t -> PublicTeamStatEntry.builder()
                        .teamId(t.teamId())
                        .teamName(t.teamName())
                        .organisationName(t.organisationName())
                        .wins(t.wins())
                        .triesScored(t.triesScored())
                        .tablePoints(t.tablePoints())
                        .build())
                .collect(Collectors.toList());

        List<PublicPlayerStatEntry> topTryScorers = leaderboard.topTryScorers().stream()
                .map(p -> PublicPlayerStatEntry.builder()
                        .playerId(p.playerId())
                        .name(p.firstName() + " " + p.lastName())
                        .teamName(p.teamName())
                        .tries(p.tries())
                        .conversions(p.conversions())
                        .penalties(p.penalties())
                        .dropGoals(p.dropGoals())
                        .totalPoints(p.totalPoints())
                        .yellowCards(p.yellowCards())
                        .redCards(p.redCards())
                        .build())
                .collect(Collectors.toList());

        return PublicTournamentStatsResponse.builder()
                .topScorers(topScorers)
                .topOffenders(topOffenders)
                .topTeams(topTeams)
                .topTryScorers(topTryScorers)
                .totalMatches(summary.totalMatches())
                .totalTries(summary.totalTries())
                .totalConversions(summary.totalConversions())
                .totalPenalties(summary.totalPenalties())
                .totalYellowCards(summary.totalYellowCards())
                .totalRedCards(summary.totalRedCards())
                .totalPoints(summary.totalPoints())
                .build();
    }
}
