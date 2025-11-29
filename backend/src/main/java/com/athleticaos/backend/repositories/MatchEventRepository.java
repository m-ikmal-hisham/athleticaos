package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.MatchEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchEventRepository extends JpaRepository<MatchEvent, UUID> {
    List<MatchEvent> findByMatchId(UUID matchId);

    List<MatchEvent> findByMatch_Tournament_Id(UUID tournamentId);

    List<MatchEvent> findByPlayer_Id(UUID playerId);
}
