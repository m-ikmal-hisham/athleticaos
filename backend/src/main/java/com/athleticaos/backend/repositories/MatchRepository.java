package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
        List<Match> findByTournamentId(UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam " +
                        "LEFT JOIN FETCH m.awayTeam " +
                        "LEFT JOIN FETCH m.stage " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE m.tournament.id = :tournamentId AND m.deleted = false")
        List<Match> findByTournamentIdWithTeams(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        List<Match> findByStageId(UUID stageId);

        // Find matches where the team is either home or away
        List<Match> findByHomeTeamIdOrAwayTeamId(UUID homeTeamId, UUID awayTeamId);

        List<Match> findByTournamentIdAndStatus(UUID tournamentId, com.athleticaos.backend.enums.MatchStatus status);

        List<Match> findByStatus(com.athleticaos.backend.enums.MatchStatus status);

        long countByStatus(com.athleticaos.backend.enums.MatchStatus status);

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

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t.id) FROM Match m JOIN m.homeTeam t LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countActiveTeamsAsHome(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t.id) FROM Match m JOIN m.awayTeam t LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countActiveTeamsAsAway(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        // Helper to get total distinct teams (home + away union logic is hard in JPQL
        // count, so might need native or Java side sum of sets if I can't do UNION)
        // Actually, "SELECT count(distinct t) FROM Team t WHERE t.id IN (SELECT
        // m.homeTeam.id FROM Match m WHERE ...) OR t.id IN (SELECT m.awayTeam.id FROM
        // Match m WHERE ...)"
        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT t) FROM Team t WHERE " +
                        "t.id IN (SELECT mh.homeTeam.id FROM Match mh LEFT JOIN mh.stage sh LEFT JOIN sh.category ch WHERE mh.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR ch.id = :categoryId)) OR "
                        +
                        "t.id IN (SELECT ma.awayTeam.id FROM Match ma LEFT JOIN ma.stage sa LEFT JOIN sa.category ca WHERE ma.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR ca.id = :categoryId))")
        long countActiveTeamsByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countCompletedMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

}
