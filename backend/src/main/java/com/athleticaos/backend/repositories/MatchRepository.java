package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.tournament.id = :tournamentId AND m.deleted = false")
        List<Match> findByTournamentId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam " +
                        "LEFT JOIN FETCH m.awayTeam " +
                        "LEFT JOIN FETCH m.stage " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE m.tournament.id = :tournamentId AND m.deleted = false")
        List<Match> findByTournamentIdWithTeams(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.stage.id = :stageId AND m.deleted = false")
        List<Match> findByStageId(@org.springframework.data.repository.query.Param("stageId") UUID stageId);

        // Find matches where the team is either home or away
        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE (m.homeTeam.id = :homeTeamId OR m.awayTeam.id = :awayTeamId) AND m.deleted = false")
        List<Match> findByHomeTeamIdOrAwayTeamId(@org.springframework.data.repository.query.Param("homeTeamId") UUID homeTeamId, @org.springframework.data.repository.query.Param("awayTeamId") UUID awayTeamId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE (m.homeTeam.id = :teamId OR m.awayTeam.id = :teamId) AND m.tournament.id = :tournamentId AND m.deleted = false")
        List<Match> findByTeamIdAndTournamentId(@org.springframework.data.repository.query.Param("teamId") UUID teamId, @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.tournament.id = :tournamentId AND m.status = :status AND m.deleted = false")
        List<Match> findByTournamentIdAndStatus(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId, @org.springframework.data.repository.query.Param("status") com.athleticaos.backend.enums.MatchStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.status = :status AND m.deleted = false")
        List<Match> findByStatus(@org.springframework.data.repository.query.Param("status") com.athleticaos.backend.enums.MatchStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m WHERE m.status = :status AND m.deleted = false")
        long countByStatus(@org.springframework.data.repository.query.Param("status") com.athleticaos.backend.enums.MatchStatus status);

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM Match m " +
                        "LEFT JOIN m.homeTeam ht " +
                        "LEFT JOIN ht.organisation hto " +
                        "LEFT JOIN m.awayTeam at " +
                        "LEFT JOIN at.organisation ato " +
                        "JOIN m.tournament t " +
                        "JOIN t.organiserOrg tOrg " +
                        "LEFT JOIN FETCH m.stage " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE (hto.id IN :orgIds OR ato.id IN :orgIds OR tOrg.id IN :orgIds) AND m.deleted = false")
        List<Match> findMatchesByOrganisationIds(
                        @org.springframework.data.repository.query.Param("orgIds") java.util.Set<UUID> orgIds);

        List<Match> findByMatchCode(String matchCode);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Match m SET m.deleted = true WHERE m.tournament.id = :tournamentId")
        void softDeleteByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        void deleteByTournamentId(UUID tournamentId);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("DELETE FROM Match m WHERE m.tournament.id = :tournamentId AND m.stage.id IN (SELECT s.id FROM TournamentStage s WHERE s.tournament.id = :tournamentId AND s.category.id = :categoryId)")
        void deleteByTournamentIdAndCategoryId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Match m SET m.nextMatchIdForWinner = NULL, m.nextMatchIdForLoser = NULL WHERE m.tournament.id = :tournamentId")
        void clearNextMatchReferences(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Match m SET m.nextMatchIdForWinner = NULL, m.nextMatchIdForLoser = NULL WHERE m.tournament.id = :tournamentId AND m.stage.category.id = :categoryId")
        void clearNextMatchReferencesForCategory(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId);

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam ht " +
                        "LEFT JOIN FETCH ht.organisation hto " +
                        "LEFT JOIN FETCH m.awayTeam at " +
                        "LEFT JOIN FETCH at.organisation ato " +
                        "LEFT JOIN FETCH m.tournament t " +
                        "LEFT JOIN FETCH t.organiserOrg tOrg " +
                        "LEFT JOIN FETCH m.stage")
        List<Match> findAllWithDetails();

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam ht " +
                        "LEFT JOIN FETCH ht.organisation hto " +
                        "LEFT JOIN FETCH m.awayTeam at " +
                        "LEFT JOIN FETCH at.organisation ato " +
                        "LEFT JOIN FETCH m.tournament t " +
                        "LEFT JOIN FETCH t.organiserOrg tOrg " +
                        "LEFT JOIN FETCH m.stage " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE t.id = :tournamentId AND m.deleted = false")
        List<Match> findByTournamentIdWithDetails(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t.id) FROM Match m JOIN m.homeTeam t LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long countActiveTeamsAsHome(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t.id) FROM Match m JOIN m.awayTeam t LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long countActiveTeamsAsAway(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        // Helper to get total distinct teams (home + away union logic is hard in JPQL
        // count, so might need native or Java side sum of sets if I can't do UNION)
        // Actually, "SELECT count(distinct t) FROM Team t WHERE t.id IN (SELECT
        // m.homeTeam.id FROM Match m WHERE ...) OR t.id IN (SELECT m.awayTeam.id FROM
        // Match m WHERE ...)"
        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t) FROM Team t WHERE " +
                        "t.id IN (SELECT mh.homeTeam.id FROM Match mh LEFT JOIN mh.stage sh LEFT JOIN sh.category ch WHERE mh.tournament.id = :tournamentId AND mh.deleted = false AND (:isCategoryIdNull = true OR ch IS NULL OR ch.id = :categoryId)) OR "
                        +
                        "t.id IN (SELECT ma.awayTeam.id FROM Match ma LEFT JOIN ma.stage sa LEFT JOIN sa.category ca WHERE ma.tournament.id = :tournamentId AND ma.deleted = false AND (:isCategoryIdNull = true OR ca IS NULL OR ca.id = :categoryId))")
        long countActiveTeamsByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.deleted = false AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long countMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED AND m.deleted = false AND (:isCategoryIdNull = true OR c IS NULL OR c.id = :categoryId)")
        long countCompletedMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.nextMatchIdForWinner = :nextMatchId AND (m.winnerSlot = :slot OR :slot IS NULL) AND m.deleted = false")
        List<Match> findByNextMatchIdForWinnerAndWinnerSlot(@org.springframework.data.repository.query.Param("nextMatchId") UUID nextMatchId, @org.springframework.data.repository.query.Param("slot") String slot);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.nextMatchIdForLoser = :nextMatchId AND (m.loserSlot = :slot OR :slot IS NULL) AND m.deleted = false")
        List<Match> findByNextMatchIdForLoserAndLoserSlot(@org.springframework.data.repository.query.Param("nextMatchId") UUID nextMatchId, @org.springframework.data.repository.query.Param("slot") String slot);
}
