package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.stats.PlayerStatsResponse;
import com.athleticaos.backend.dtos.stats.TeamStatsResponse;
import com.athleticaos.backend.dtos.stats.TournamentStatsSummaryResponse;
import com.athleticaos.backend.dtos.stats.leaderboard.TournamentLeaderboardResponse;
import com.athleticaos.backend.services.StatisticsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
@Tag(name = "Statistics")
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final com.athleticaos.backend.services.PlayerService playerService;

    @GetMapping("/tournaments/{tournamentId}/summary")
    @PreAuthorize("isAuthenticated()")
    public TournamentStatsSummaryResponse getTournamentSummary(
            @PathVariable UUID tournamentId) {
        return statisticsService.getTournamentSummary(tournamentId);
    }

    @GetMapping("/tournaments/{tournamentId}/players")
    @PreAuthorize("isAuthenticated()")
    public List<PlayerStatsResponse> getTournamentPlayerStats(
            @PathVariable UUID tournamentId) {
        return statisticsService.getPlayerStatsForTournament(tournamentId);
    }

    @GetMapping("/tournaments/{tournamentId}/teams")
    @PreAuthorize("isAuthenticated()")
    public List<TeamStatsResponse> getTournamentTeamStats(
            @PathVariable UUID tournamentId) {
        return statisticsService.getTeamStatsForTournament(tournamentId);
    }

    @GetMapping("/tournaments/{tournamentId}/leaderboard")
    @PreAuthorize("isAuthenticated()")
    public TournamentLeaderboardResponse getTournamentLeaderboard(
            @PathVariable UUID tournamentId) {
        return statisticsService.getTournamentLeaderboard(tournamentId);
    }

    @GetMapping("/players/{id}")
    @PreAuthorize("isAuthenticated()")
    public PlayerStatsResponse getPlayerStatsAcrossTournaments(
            @PathVariable String id) {
        UUID uuid;
        try {
            uuid = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            uuid = playerService.getPlayerBySlug(id).id();
        }
        return statisticsService.getPlayerStatsAcrossTournaments(uuid);
    }

    @GetMapping("/teams/{teamId}")
    @PreAuthorize("isAuthenticated()")
    public TeamStatsResponse getTeamStatsAcrossTournaments(
            @PathVariable UUID teamId) {
        return statisticsService.getTeamStatsAcrossTournaments(teamId);
    }
}
