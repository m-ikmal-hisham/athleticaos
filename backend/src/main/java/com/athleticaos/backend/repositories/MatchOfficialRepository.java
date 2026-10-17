package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.MatchOfficial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchOfficialRepository extends JpaRepository<MatchOfficial, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT mo FROM MatchOfficial mo LEFT JOIN FETCH mo.official off LEFT JOIN FETCH off.person p LEFT JOIN FETCH off.user u LEFT JOIN FETCH mo.officialRole ro WHERE mo.match.id = :matchId")
    List<MatchOfficial> findByMatchId(@org.springframework.data.repository.query.Param("matchId") UUID matchId);

    List<MatchOfficial> findByOfficialId(UUID officialId);

    void deleteByMatchId(UUID matchId);

    void deleteByMatchIdIn(List<UUID> matchIds);

    void deleteByMatch_Tournament_Id(UUID tournamentId);
    List<MatchOfficial> findByMatch_Tournament_Id(UUID tournamentId);

    @org.springframework.data.jpa.repository.Query("SELECT mo FROM MatchOfficial mo JOIN FETCH mo.match m LEFT JOIN FETCH mo.official off LEFT JOIN FETCH off.person p LEFT JOIN FETCH off.user u LEFT JOIN FETCH mo.officialRole ro WHERE m.tournament.id = :tournamentId")
    List<MatchOfficial> findByTournamentIdWithDetails(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(mo) > 0 THEN TRUE ELSE FALSE END FROM MatchOfficial mo " +
            "JOIN mo.official off LEFT JOIN off.user u LEFT JOIN off.person p " +
            "WHERE mo.match.id = :matchId AND (u.id = :userId OR p.userId = :userId)")
    boolean isUserAssignedToMatch(@org.springframework.data.repository.query.Param("matchId") UUID matchId,
                                  @org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(mo) > 0 THEN TRUE ELSE FALSE END FROM MatchOfficial mo " +
            "JOIN mo.match m JOIN mo.official off LEFT JOIN off.user u LEFT JOIN off.person p " +
            "WHERE m.tournament.id = :tournamentId AND (u.id = :userId OR p.userId = :userId)")
    boolean isUserAssignedToTournamentMatches(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                                             @org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m.tournament.id FROM MatchOfficial mo " +
            "JOIN mo.match m JOIN mo.official off LEFT JOIN off.user u LEFT JOIN off.person p " +
            "WHERE (u.id = :userId OR p.userId = :userId)")
    java.util.List<UUID> findTournamentIdsByAssignedMatchOfficialUser(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
