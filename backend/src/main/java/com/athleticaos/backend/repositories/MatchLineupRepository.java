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

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(l) FROM MatchLineup l WHERE l.player.id = :playerId AND l.match.tournament.id = :tournamentId AND l.match.deleted = false")
        long countByPlayerIdAndMatch_TournamentId(@org.springframework.data.repository.query.Param("playerId") UUID playerId, @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT l FROM MatchLineup l WHERE l.match.tournament.id = :tournamentId AND l.match.deleted = false")
        List<MatchLineup> findByMatch_Tournament_Id(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    void deleteByMatch_Tournament_Id(UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT l FROM MatchLineup l WHERE l.player.id = :playerId AND l.match.deleted = false")
        List<MatchLineup> findByPlayerId(@org.springframework.data.repository.query.Param("playerId") UUID playerId);

    List<MatchLineup> findByMatchIdAndPlayerIdIn(UUID matchId, List<UUID> playerIds);

    void deleteByMatchId(UUID matchId);

    void deleteByMatchIdIn(List<UUID> matchIds);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT l.player.id) FROM MatchLineup l LEFT JOIN l.match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.deleted = false AND (:isCategoryIdNull = true OR c.id = :categoryId)")
    long countDistinctPlayersByTournamentId(
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
            @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);
}
