package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
    List<Match> findByTournamentId(UUID tournamentId);

    List<Match> findByStageId(UUID stageId);

    // Find matches where the team is either home or away
    List<Match> findByHomeTeamIdOrAwayTeamId(UUID homeTeamId, UUID awayTeamId);

    List<Match> findByTournamentIdAndStatus(UUID tournamentId, com.athleticaos.backend.enums.MatchStatus status);
}
