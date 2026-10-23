package com.athleticaos.backend.controllers;

import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.dtos.public_api.PublicStatsSummaryResponse;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public summary statistics for AthleticaOS platform overview and the public journey page.
 * Cached for 30s via {@link PublicHttpCache}.
 */
@RestController
@RequestMapping("/api/public/stats")
@RequiredArgsConstructor
public class PublicStatsController {

    private final TournamentRepository tournamentRepository;
    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;

    @GetMapping("/summary")
    public ResponseEntity<PublicStatsSummaryResponse> getSummary() {
        long tournaments = tournamentRepository.countPublished();
        long teams = teamRepository.countActiveTeams();
        long players = playerRepository.countByDeletedFalse();
        long matchesPlayed = matchRepository.countByStatusInPublishedTournaments(MatchStatus.COMPLETED);

        return PublicHttpCache.ok(new PublicStatsSummaryResponse(
                tournaments,
                teams,
                players,
                matchesPlayed
        ));
    }
}
