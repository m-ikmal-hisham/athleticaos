package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.dtos.public_api.*;
import com.athleticaos.backend.dtos.tournament.TournamentResponse;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.TournamentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicTournamentController {

    private final TournamentService tournamentService;
    private final MatchService matchService;
    private final com.athleticaos.backend.repositories.TournamentTeamRepository tournamentTeamRepository;
    private final com.athleticaos.backend.repositories.MatchEventRepository matchEventRepository;
    private final com.athleticaos.backend.repositories.OrganisationRepository organisationRepository;

    @GetMapping("/tournaments")
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

    @GetMapping("/tournaments/{id}")
    public ResponseEntity<PublicTournamentDetailResponse> getTournamentDetail(@PathVariable UUID id) {
        TournamentResponse tournament = tournamentService.getTournamentById(id);

        if (!tournament.isPublished()) {
            return ResponseEntity.notFound().build();
        }

        PublicTournamentDetailResponse response = mapToPublicDetail(tournament);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tournaments/{id}/matches")
    public ResponseEntity<List<PublicMatchSummaryResponse>> getTournamentMatches(
            @PathVariable UUID id,
            @RequestParam(required = false) String stage) {

        // Verify tournament is published
        TournamentResponse tournament = tournamentService.getTournamentById(id);
        if (!tournament.isPublished()) {
            return ResponseEntity.notFound().build();
        }

        List<MatchResponse> matches = matchService.getMatchesByTournament(id);

        List<PublicMatchSummaryResponse> response = matches.stream()
                .map(this::mapToPublicMatchSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/matches/{matchId}")
    public ResponseEntity<PublicMatchDetailResponse> getMatchDetail(@PathVariable UUID matchId) {
        MatchResponse match = matchService.getMatchById(matchId);

        // Verify tournament is published
        TournamentResponse tournament = tournamentService.getTournamentById(match.getTournamentId());
        if (!tournament.isPublished()) {
            return ResponseEntity.notFound().build();
        }

        PublicMatchDetailResponse response = mapToPublicMatchDetail(match);
        return ResponseEntity.ok(response);
    }

    // Mappers

    private PublicTournamentSummaryResponse mapToPublicSummary(TournamentResponse t) {
        return PublicTournamentSummaryResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .level(t.getLevel())
                .seasonName(t.getSeasonName())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .venue(t.getVenue())
                .isLive("Ongoing".equalsIgnoreCase(t.getStatus()))
                .isCompleted("Completed".equalsIgnoreCase(t.getStatus()))
                .organiserName("Organiser") // TODO: Enrich if needed, currently ID is in response
                .competitionType(t.getCompetitionType())
                .build();
    }

    private PublicTournamentDetailResponse mapToPublicDetail(TournamentResponse t) {
        // Fetch teams for this tournament
        List<PublicTeamSummary> teams = tournamentTeamRepository.findByTournamentId(t.getId())
                .stream()
                .map(tt -> PublicTeamSummary.builder()
                        .id(tt.getTeam().getId())
                        .name(tt.getTeam().getName())
                        .slug(tt.getTeam().getSlug())
                        .logoUrl(tt.getTeam().getOrganisation().getLogoUrl())
                        .build())
                .collect(Collectors.toList());

        // Fetch organiser name
        String organiserName = "Organiser";
        try {
            organiserName = organisationRepository.findById(t.getOrganiserOrgId())
                    .map(com.athleticaos.backend.entities.Organisation::getName)
                    .orElse("Organiser");
        } catch (Exception e) {
            // Fallback to default
        }

        return PublicTournamentDetailResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .level(t.getLevel())
                .seasonName(t.getSeasonName())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .venue(t.getVenue())
                .isLive("Ongoing".equalsIgnoreCase(t.getStatus()))
                .isCompleted("Completed".equalsIgnoreCase(t.getStatus()))
                .organiserName(organiserName)
                .competitionType(t.getCompetitionType())
                .teams(teams)
                .stages(List.of()) // Stages can be populated if TournamentStage is used
                .build();
    }

    private PublicMatchSummaryResponse mapToPublicMatchSummary(MatchResponse m) {
        return PublicMatchSummaryResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
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
                        com.athleticaos.backend.entities.User player = event.getPlayer();
                        playerName = player.getFirstName() + " " + player.getLastName();
                    }

                    return PublicMatchEventResponse.builder()
                            .minute(event.getMinute())
                            .teamName(event.getTeam().getName())
                            .playerName(playerName)
                            .eventType(event.getEventType().name())
                            .points(getPointsForEventType(event.getEventType()))
                            .build();
                })
                .collect(Collectors.toList());

        // Calculate team stats
        PublicTeamStatsResponse homeStats = calculateTeamStats(matchEvents, m.getHomeTeamName());
        PublicTeamStatsResponse awayStats = calculateTeamStats(matchEvents, m.getAwayTeamName());

        return PublicMatchDetailResponse.builder()
                .id(m.getId())
                .code(m.getMatchCode())
                .homeTeamName(m.getHomeTeamName())
                .awayTeamName(m.getAwayTeamName())
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
                .build();
    }

    private PublicTeamStatsResponse calculateTeamStats(List<com.athleticaos.backend.entities.MatchEvent> events,
            String teamName) {
        int tries = 0;
        int conversions = 0;
        int penalties = 0;
        int yellowCards = 0;
        int redCards = 0;

        for (com.athleticaos.backend.entities.MatchEvent event : events) {
            if (event.getTeam().getName().equals(teamName)) {
                switch (event.getEventType()) {
                    case TRY:
                        tries++;
                        break;
                    case CONVERSION:
                        conversions++;
                        break;
                    case PENALTY:
                        penalties++;
                        break;
                    case YELLOW_CARD:
                        yellowCards++;
                        break;
                    case RED_CARD:
                        redCards++;
                        break;
                    default:
                        break;
                }
            }
        }

        return PublicTeamStatsResponse.builder()
                .tries(tries)
                .conversions(conversions)
                .penalties(penalties)
                .yellowCards(yellowCards)
                .redCards(redCards)
                .build();
    }

    private int getPointsForEventType(com.athleticaos.backend.enums.MatchEventType eventType) {
        if (eventType == null)
            return 0;
        switch (eventType) {
            case TRY:
                return 5;
            case CONVERSION:
                return 2;
            case PENALTY:
                return 3;
            case DROP_GOAL:
                return 3;
            default:
                return 0;
        }
    }
}
