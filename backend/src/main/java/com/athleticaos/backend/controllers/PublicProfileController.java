package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.public_api.PublicPlayerDetailResponse;
import com.athleticaos.backend.dtos.public_api.PublicPlayerSummary;
import com.athleticaos.backend.dtos.public_api.PublicTeamDetailResponse;
import com.athleticaos.backend.dtos.team.TeamResponse;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.services.PlayerService;
import com.athleticaos.backend.services.TeamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @GetMapping("/teams/{idOrSlug}")
    public ResponseEntity<PublicTeamDetailResponse> getPublicTeam(@PathVariable String idOrSlug) {
        try {
            TeamResponse team = fetchTeam(idOrSlug);
            
            List<PublicPlayerSummary> players = team.getPlayers() != null ? 
                team.getPlayers().stream().map(p -> PublicPlayerSummary.builder()
                    .id(p.getPlayerId())
                    .firstName(p.getFirstName())
                    .lastName(p.getLastName())
                    .position(p.getPosition())
                    .jerseyNumber(p.getJerseyNumber())
                    .build()
                ).collect(Collectors.toList()) : List.of();
                
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
                    .build();
                    
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching public team {}", idOrSlug, e);
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/players/{idOrSlug}")
    public ResponseEntity<PublicPlayerDetailResponse> getPublicPlayer(@PathVariable String idOrSlug) {
        try {
            PlayerResponse player = fetchPlayer(idOrSlug);
            
            // Resolve position from player-team assignment
            String position = null;
            String position2 = null;
            UUID currentTeamId = null;
            Integer jerseyNumber = null;
            String currentTeamName = null;

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

            // Determine the "active" team from match lineups, prioritizing
            // active (LIVE/PUBLISHED) tournaments over completed ones.
            // This ensures a player who plays for multiple teams across
            // tournaments shows the team from the currently active tournament.
            try {
                var lineups = matchLineupRepository.findByPlayerId(player.id());
                if (lineups != null && !lineups.isEmpty()) {
                    // First, try to find a lineup from an active tournament (LIVE > PUBLISHED)
                    var activeLineup = lineups.stream()
                            .filter(l -> l.getMatch() != null && l.getMatch().getTournament() != null)
                            .filter(l -> {
                                var status = l.getMatch().getTournament().getStatus();
                                return status == com.athleticaos.backend.enums.TournamentStatus.LIVE
                                        || status == com.athleticaos.backend.enums.TournamentStatus.PUBLISHED;
                            })
                            .sorted((l1, l2) -> {
                                // Prefer LIVE over PUBLISHED
                                var s1 = l1.getMatch().getTournament().getStatus();
                                var s2 = l2.getMatch().getTournament().getStatus();
                                if (s1 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s2 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return -1;
                                if (s2 == com.athleticaos.backend.enums.TournamentStatus.LIVE && s1 != com.athleticaos.backend.enums.TournamentStatus.LIVE) return 1;
                                // Then by most recent match date
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
                    } else {
                        // No active tournament — fall back to most recent match
                        var mostRecentLineup = lineups.stream()
                                .filter(l -> l.getMatch() != null && l.getMatch().getMatchDate() != null)
                                .sorted((l1, l2) -> l2.getMatch().getMatchDate().compareTo(l1.getMatch().getMatchDate()))
                                .findFirst()
                                .orElse(null);
                        if (mostRecentLineup != null) {
                            currentTeamId = mostRecentLineup.getTeam().getId();
                            currentTeamName = mostRecentLineup.getTeam().getName();
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("Could not determine active team from lineups for {}", player.id(), ex);
            }

            // Final fallback: use first team name from player response
            if (currentTeamName == null && player.teamNames() != null && !player.teamNames().isEmpty()) {
                currentTeamName = player.teamNames().get(0);
            }
            
            PublicPlayerDetailResponse response = PublicPlayerDetailResponse.builder()
                    .id(player.id())
                    .firstName(player.firstName())
                    .lastName(player.lastName())
                    .idType(player.identificationType())
                    .idNumber("XXX") // Hide for public
                    .dateOfBirth(player.dob() != null ? player.dob().toString() : null)
                    .gender(player.gender())
                    .country(player.country())
                    .state(player.state())
                    .city(player.city())
                    .bloodGroup(null)
                    .position(position)
                    .position2(position2)
                    .jerseyNumber(jerseyNumber)
                    .organisationName(player.organisationName())
                    .profilePictureUrl(com.athleticaos.backend.utils.URLUtils.makeAbsolute(player.photoUrl()))
                    .currentTeamName(currentTeamName)
                    .currentTeamId(currentTeamId)
                    .build();
                    
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching public player {}", idOrSlug, e);
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
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> getPublicPlayerStats(@PathVariable String idOrSlug) {
        try {
            PlayerResponse player = fetchPlayer(idOrSlug);
            var stats = statisticsService.getPlayerStatsAcrossTournaments(player.id());
            if (stats == null) {
                return ResponseEntity.ok(java.util.Map.of(
                    "matchesPlayed", 0, "tries", 0, "conversions", 0,
                    "penalties", 0, "dropGoals", 0, "yellowCards", 0,
                    "redCards", 0, "totalPoints", 0, "totalMinutesPlayed", 0,
                    "recentMatches", java.util.List.of()
                ));
            }
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error fetching public player stats {}", idOrSlug, e);
            return ResponseEntity.ok(java.util.Map.of(
                "matchesPlayed", 0, "tries", 0, "conversions", 0,
                "penalties", 0, "dropGoals", 0, "yellowCards", 0,
                "redCards", 0, "totalPoints", 0, "totalMinutesPlayed", 0,
                "recentMatches", java.util.List.of()
            ));
        }
    }

    @GetMapping("/teams/{idOrSlug}/stats")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<?> getPublicTeamStats(@PathVariable String idOrSlug) {
        try {
            TeamResponse team = fetchTeam(idOrSlug);
            var stats = statisticsService.getTeamStatsAcrossTournaments(team.getId());
            if (stats == null) {
                return ResponseEntity.ok(java.util.Map.of(
                    "matchesPlayed", 0, "wins", 0, "draws", 0, "losses", 0,
                    "pointsFor", 0, "pointsAgainst", 0, "triesScored", 0,
                    "yellowCards", 0, "redCards", 0
                ));
            }
            return ResponseEntity.ok(stats);
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
