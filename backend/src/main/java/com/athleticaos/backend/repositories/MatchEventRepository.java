package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.MatchEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchEventRepository extends JpaRepository<MatchEvent, UUID> {
        List<MatchEvent> findByMatchId(UUID matchId);

        @org.springframework.data.jpa.repository.Query("SELECT e FROM MatchEvent e WHERE e.match.tournament.id = :tournamentId AND e.match.deleted = false")
        List<MatchEvent> findByMatch_Tournament_Id(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT e FROM MatchEvent e WHERE e.player.id = :playerId AND e.match.deleted = false")
        List<MatchEvent> findByPlayer_Id(@org.springframework.data.repository.query.Param("playerId") UUID playerId);

        @org.springframework.data.jpa.repository.Query("SELECT e FROM MatchEvent e WHERE (e.player.id = :playerId OR e.relatedPlayer.id = :playerId) AND e.match.deleted = false")
        List<MatchEvent> findByPlayerIdOrRelatedPlayerId(@org.springframework.data.repository.query.Param("playerId") UUID playerId);

        @org.springframework.data.jpa.repository.Query("SELECT e FROM MatchEvent e WHERE e.match.id = :matchId AND e.match.deleted = false")
        List<MatchEvent> findAllByMatchIdIncludingDeleted(@org.springframework.data.repository.query.Param("matchId") UUID matchId);

        void deleteByMatch_Tournament_Id(UUID tournamentId);

        void deleteByMatchId(UUID matchId);

        void deleteByMatchIdIn(List<UUID> matchIds);

        long countByMatchIdAndPlayerIdAndEventType(UUID matchId, UUID playerId,
                        com.athleticaos.backend.enums.MatchEventType eventType);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(e) FROM MatchEvent e LEFT JOIN e.match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.deleted = false AND e.eventType = :eventType AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long countByTournamentIdAndEventType(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("eventType") com.athleticaos.backend.enums.MatchEventType eventType,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(CASE WHEN e.eventType = com.athleticaos.backend.enums.MatchEventType.TRY THEN 5 WHEN e.eventType = com.athleticaos.backend.enums.MatchEventType.CONVERSION THEN 2 WHEN e.eventType = com.athleticaos.backend.enums.MatchEventType.PENALTY THEN 3 WHEN e.eventType = com.athleticaos.backend.enums.MatchEventType.DROP_GOAL THEN 3 ELSE 0 END), 0) FROM MatchEvent e LEFT JOIN e.match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.deleted = false AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long sumPointsByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT e.player.id, e.eventType, COUNT(e) FROM MatchEvent e WHERE e.team.id = :teamId AND e.player IS NOT NULL AND e.match.deleted = false GROUP BY e.player.id, e.eventType")
        List<Object[]> countEventsByTeamIdAndEventType(@org.springframework.data.repository.query.Param("teamId") java.util.UUID teamId);

        @org.springframework.data.jpa.repository.Query("SELECT e.player.id, e.eventType, COUNT(e) FROM MatchEvent e WHERE e.team.id = :teamId AND e.match.tournament.id = :tournamentId AND e.player IS NOT NULL AND e.match.deleted = false GROUP BY e.player.id, e.eventType")
        List<Object[]> countEventsByTeamIdAndEventTypeAndTournamentId(@org.springframework.data.repository.query.Param("teamId") java.util.UUID teamId, @org.springframework.data.repository.query.Param("tournamentId") java.util.UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT e.eventType, COUNT(e) FROM MatchEvent e WHERE e.team.id = :teamId AND e.match.deleted = false GROUP BY e.eventType")
        List<Object[]> countEventsByTeamIdGroupByEventType(@org.springframework.data.repository.query.Param("teamId") java.util.UUID teamId);

        @org.springframework.data.jpa.repository.Query("SELECT e.eventType, COUNT(e) FROM MatchEvent e WHERE e.team.id = :teamId AND e.match.tournament.id = :tournamentId AND e.match.deleted = false GROUP BY e.eventType")
        List<Object[]> countEventsByTeamIdAndTournamentIdGroupByEventType(@org.springframework.data.repository.query.Param("teamId") java.util.UUID teamId, @org.springframework.data.repository.query.Param("tournamentId") java.util.UUID tournamentId);
}
