package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.MatchLineup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchLineupRepository extends JpaRepository<MatchLineup, UUID> {
    List<MatchLineup> findByMatchId(UUID matchId);

    List<MatchLineup> findByMatchIdAndTeamId(UUID matchId, UUID teamId);

    void deleteByMatchIdAndTeamId(UUID matchId, UUID teamId);

    long countByPlayerIdAndMatch_TournamentId(UUID playerId, UUID tournamentId);

    List<MatchLineup> findByMatch_Tournament_Id(UUID tournamentId);

    void deleteByMatch_Tournament_Id(UUID tournamentId);
}
