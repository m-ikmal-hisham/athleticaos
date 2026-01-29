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

    void deleteByMatch_Tournament_Id(UUID tournamentId);

    void deleteByMatchId(UUID matchId);

    void deleteByMatchIdIn(List<UUID> matchIds);

    long countByMatchIdAndPlayerIdAndEventType(UUID matchId, UUID playerId,
            com.athleticaos.backend.enums.MatchEventType eventType);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(e) FROM MatchEvent e WHERE e.match.tournament.id = :tournamentId AND e.eventType = :eventType AND (:categoryId IS NULL OR e.match.stage.category.id = :categoryId)")
    long countByTournamentIdAndEventType(
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            @org.springframework.data.repository.query.Param("eventType") com.athleticaos.backend.enums.MatchEventType eventType,
            @org.springframework.data.repository.query.Param("categoryId") UUID categoryId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(CASE WHEN e.eventType = 'TRY' THEN 5 WHEN e.eventType = 'CONVERSION' THEN 2 WHEN e.eventType = 'PENALTY' THEN 3 WHEN e.eventType = 'DROP_GOAL' THEN 3 ELSE 0 END), 0) FROM MatchEvent e WHERE e.match.tournament.id = :tournamentId AND (:categoryId IS NULL OR e.match.stage.category.id = :categoryId)")
    long sumPointsByTournamentId(
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            @org.springframework.data.repository.query.Param("categoryId") UUID categoryId);
}
