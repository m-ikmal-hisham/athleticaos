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

            List<PublicMatchSummaryResponse> response = matches.stream()
                    .map(this::mapToPublicMatchSummary)
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

            PublicTournamentStatsResponse response = mapToPublicStats(leaderboard);
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
                .logoUrl(t.getLogoUrl())
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
                        .logoUrl(tt.getTeam().getOrganisation() != null ? tt.getTeam().getOrganisation().getLogoUrl()
                                : null)
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
                .logoUrl(t.getLogoUrl())
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
                        .logoUrl(org.getLogoUrl())
                        .coverImageUrl(org.getCoverImageUrl())
                        .build())
                .orElse(null);
    }

    private PublicMatchSummaryResponse mapToPublicMatchSummary(MatchResponse m) {
        return PublicMatchSummaryResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
                .homeTeamLogoUrl(m.getHomeTeamLogoUrl())
                .awayTeamLogoUrl(m.getAwayTeamLogoUrl())
                .homeTeamShortName(m.getHomeTeamShortName())
                .awayTeamShortName(m.getAwayTeamShortName())
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
                .matchTime(m.getKickOffTime())
                .venue(m.getVenue())
                .status(m.getStatus())
                .stage(m.getPhase()) // Mapping phase to stage for now
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
                .homeTeamLogoUrl(m.getHomeTeamLogoUrl())
                .awayTeamLogoUrl(m.getAwayTeamLogoUrl())
                .homeTeamShortName(m.getHomeTeamShortName())
                .awayTeamShortName(m.getAwayTeamShortName())
                .homeScore(m.getHomeScore())
                .awayScore(m.getAwayScore())
                .matchDate(m.getMatchDate())
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
            com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse leaderboard) {
        List<PublicPlayerStatEntry> topScorers = leaderboard.topPlayers().stream()
                .map(p -> PublicPlayerStatEntry.builder()
                        .playerId(p.playerId())
                        .name(p.firstName() + " " + p.lastName())
                        .teamName(p.teamName())
                        .tries(p.tries())
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

        return PublicTournamentStatsResponse.builder()
                .topScorers(topScorers)
                .topOffenders(topOffenders)
                .topTeams(topTeams)
                .build();
    }
}
