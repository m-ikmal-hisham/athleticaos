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

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class PublicProfileController {

    private final TeamService teamService;
    private final PlayerService playerService;

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
                    .build()
                ).collect(Collectors.toList()) : List.of();
                
            PublicTeamDetailResponse response = PublicTeamDetailResponse.builder()
                    .id(team.getId())
                    .name(team.getName())
                    .shortName(team.getShortName())
                    .slug(team.getSlug())
                    .logoUrl(team.getLogoUrl())
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
            
            PublicPlayerDetailResponse response = PublicPlayerDetailResponse.builder()
                    .id(player.id())
                    .firstName(player.firstName())
                    .lastName(player.lastName())
                    .idType(player.identificationType())
                    .idNumber("XXX") // Hide for public
                    .dateOfBirth(player.dob() != null ? "Hidden" : null) // Hide for public
                    .gender(player.gender())
                    .country(player.country())
                    .state(player.state())
                    .city(player.city())
                    .bloodGroup(null)
                    .position(null)
                    .position2(null)
                    .profilePictureUrl(player.photoUrl())
                    .currentTeamName(player.teamNames() != null && !player.teamNames().isEmpty() ? player.teamNames().get(0) : null)
                    .currentTeamId(null)
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

    private PlayerResponse fetchPlayer(String idOrSlug) {
        try {
            UUID uuid = UUID.fromString(idOrSlug);
            return playerService.getPlayerById(uuid);
        } catch (IllegalArgumentException e) {
            return playerService.getPlayerBySlug(idOrSlug);
        }
    }
}
