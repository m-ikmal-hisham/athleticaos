package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.tournament.id = :tournamentId AND m.deleted = false ORDER BY m.matchDate ASC, m.kickOffTime ASC")
        List<Match> findByTournamentId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam " +
                        "LEFT JOIN FETCH m.awayTeam " +
                        "LEFT JOIN FETCH m.stage s " +
                        "LEFT JOIN FETCH s.category " +
                        "LEFT JOIN FETCH m.category " +
                        "WHERE m.tournament.id = :tournamentId AND m.deleted = false " +
                        "ORDER BY m.matchDate ASC, m.kickOffTime ASC")
        List<Match> findByTournamentIdWithTeams(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.stage.id = :stageId AND m.deleted = false")
        List<Match> findByStageId(@org.springframework.data.repository.query.Param("stageId") UUID stageId);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m WHERE m.stage.id = :stageId")
        long countByStageIdIncludingDeleted(@org.springframework.data.repository.query.Param("stageId") UUID stageId);

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

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                        "WHERE m.status = :status AND m.deleted = false " +
                        "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false)")
        long countByStatusInPublishedTournaments(
                        @org.springframework.data.repository.query.Param("status") com.athleticaos.backend.enums.MatchStatus status);

        // Same visibility rule as MatchServiceImpl: either team's organisation or the organiser is in scope
        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT m) FROM Match m " +
                        "LEFT JOIN m.homeTeam ht LEFT JOIN m.awayTeam at LEFT JOIN m.tournament t " +
                        "WHERE m.deleted = false " +
                        "AND (ht.organisation.id IN :orgIds OR at.organisation.id IN :orgIds OR t.organiserOrg.id IN :orgIds)")
        long countInOrganisations(
                        @org.springframework.data.repository.query.Param("orgIds") java.util.Collection<UUID> orgIds);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT m) FROM Match m " +
                        "LEFT JOIN m.homeTeam ht LEFT JOIN m.awayTeam at LEFT JOIN m.tournament t " +
                        "WHERE m.deleted = false AND m.status = :status " +
                        "AND (ht.organisation.id IN :orgIds OR at.organisation.id IN :orgIds OR t.organiserOrg.id IN :orgIds)")
        long countByStatusInOrganisations(
                        @org.springframework.data.repository.query.Param("status") com.athleticaos.backend.enums.MatchStatus status,
                        @org.springframework.data.repository.query.Param("orgIds") java.util.Collection<UUID> orgIds);

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

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.matchCode = :matchCode AND m.deleted = false")
        List<Match> findByMatchCode(@org.springframework.data.repository.query.Param("matchCode") String matchCode);

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
                        "WHERE t.id IN :tournamentIds AND m.deleted = false " +
                        "ORDER BY m.matchDate ASC, m.kickOffTime ASC")
        List<Match> findByTournamentIdInWithDetails(
                        @org.springframework.data.repository.query.Param("tournamentIds") java.util.Collection<UUID> tournamentIds);

        @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM Match m " +
                        "LEFT JOIN FETCH m.homeTeam ht " +
                        "LEFT JOIN FETCH ht.organisation hto " +
                        "LEFT JOIN FETCH m.awayTeam at " +
                        "LEFT JOIN FETCH at.organisation ato " +
                        "LEFT JOIN FETCH m.tournament t " +
                        "LEFT JOIN FETCH t.organiserOrg tOrg " +
                        "LEFT JOIN FETCH m.stage " +
                        "WHERE t.id = :tournamentId AND m.deleted = false " +
                        "ORDER BY m.matchDate ASC, m.kickOffTime ASC")
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
                        "t.id IN (SELECT mh.homeTeam.id FROM Match mh LEFT JOIN mh.stage sh LEFT JOIN sh.category ch WHERE mh.tournament.id = :tournamentId AND mh.deleted = false AND (:isCategoryIdNull = true OR ch.id = :categoryId)) OR "
                        +
                        "t.id IN (SELECT ma.awayTeam.id FROM Match ma LEFT JOIN ma.stage sa LEFT JOIN sa.category ca WHERE ma.tournament.id = :tournamentId AND ma.deleted = false AND (:isCategoryIdNull = true OR ca.id = :categoryId))")
        long countActiveTeamsByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.deleted = false AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m LEFT JOIN m.stage s LEFT JOIN s.category c WHERE m.tournament.id = :tournamentId AND m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED AND m.deleted = false AND (:isCategoryIdNull = true OR c.id = :categoryId)")
        long countCompletedMatchesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("categoryId") UUID categoryId,
                        @org.springframework.data.repository.query.Param("isCategoryIdNull") boolean isCategoryIdNull);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.nextMatchIdForWinner = :nextMatchId AND (m.winnerSlot = :slot OR :slot IS NULL) AND m.deleted = false")
        List<Match> findByNextMatchIdForWinnerAndWinnerSlot(@org.springframework.data.repository.query.Param("nextMatchId") UUID nextMatchId, @org.springframework.data.repository.query.Param("slot") String slot);

        @org.springframework.data.jpa.repository.Query("SELECT m FROM Match m WHERE m.nextMatchIdForLoser = :nextMatchId AND (m.loserSlot = :slot OR :slot IS NULL) AND m.deleted = false")
        List<Match> findByNextMatchIdForLoserAndLoserSlot(@org.springframework.data.repository.query.Param("nextMatchId") UUID nextMatchId, @org.springframework.data.repository.query.Param("slot") String slot);

        @org.springframework.data.jpa.repository.Query("SELECT COALESCE(MAX(m.matchNumber), 0) FROM Match m WHERE m.tournament.id = :tournamentId AND m.deleted = false")
        int findMaxMatchNumberByTournamentId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        @org.springframework.data.jpa.repository.Query("SELECT COALESCE(MAX(m.matchNumber), 0) FROM Match m " +
                        "WHERE m.tournament.id = :tournamentId " +
                        "AND m.tournamentVenue.id = :venueId " +
                        "AND m.deleted = false")
        int findMaxMatchNumberByTournamentIdAndVenueId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                        @org.springframework.data.repository.query.Param("venueId") UUID venueId);

        @org.springframework.data.jpa.repository.Query("SELECT COALESCE(MAX(m.matchNumber), 0) FROM Match m " +
                        "WHERE m.tournament.id = :tournamentId " +
                        "AND m.tournamentVenue IS NULL " +
                        "AND m.deleted = false")
        int findMaxMatchNumberByTournamentIdAndVenueNull(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

        default int findMaxMatchNumber(UUID tournamentId, UUID venueId) {
            if (venueId == null) {
                return findMaxMatchNumberByTournamentIdAndVenueNull(tournamentId);
            } else {
                return findMaxMatchNumberByTournamentIdAndVenueId(tournamentId, venueId);
            }
        }

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM Match m WHERE m.tournamentVenue.id = :venueId AND m.deleted = false")
        long countByTournamentVenueIdAndDeletedFalse(
                        @org.springframework.data.repository.query.Param("venueId") UUID venueId);

        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
        @org.springframework.data.jpa.repository.Query(value = "UPDATE matches SET venue = :venueName WHERE venue_id = :venueId", nativeQuery = true)
        void updateVenueNameForVenueId(
                        @org.springframework.data.repository.query.Param("venueId") UUID venueId,
                        @org.springframework.data.repository.query.Param("venueName") String venueName);

        /**
         * Number of distinct assigned venues in a tournament. Blank and null venues are excluded, so
         * this answers "does this tournament run at more than one venue" with a single scalar query
         * instead of loading every match.
         */
        @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT m.tournamentVenue.id) FROM Match m " +
                        "WHERE m.tournament.id = :tournamentId " +
                        "AND m.deleted = false " +
                        "AND m.tournamentVenue IS NOT NULL")
        long countDistinctVenuesByTournamentId(
                        @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    // -------------------------------------------------------------------------
    // Public Match Feed queries
    // -------------------------------------------------------------------------

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT m FROM Match m " +
                "JOIN FETCH m.tournament t " +
                "LEFT JOIN FETCH m.homeTeam ht " +
                "LEFT JOIN FETCH ht.organisation hto " +
                "LEFT JOIN FETCH m.awayTeam at " +
                "LEFT JOIN FETCH at.organisation ato " +
                "LEFT JOIN FETCH m.stage s " +
                "LEFT JOIN FETCH s.category sc " +
                "LEFT JOIN FETCH m.category c " +
                "LEFT JOIN FETCH m.tournamentVenue tv " +
                "WHERE m.deleted = false " +
                "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                "AND m.status IN (com.athleticaos.backend.enums.MatchStatus.LIVE, com.athleticaos.backend.enums.MatchStatus.ONGOING) " +
                // Only today or yesterday: a match left on LIVE by mistake drops out after a day
                "AND m.matchDate >= :liveFrom " +
                "ORDER BY m.matchDate ASC, m.kickOffTime ASC NULLS LAST, m.id ASC",
        countQuery = "SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                     "WHERE m.deleted = false " +
                     "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                     "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                     "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                     "AND m.status IN (com.athleticaos.backend.enums.MatchStatus.LIVE, com.athleticaos.backend.enums.MatchStatus.ONGOING) " +
                     "AND m.matchDate >= :liveFrom"
    )
    org.springframework.data.domain.Page<Match> findFeedLive(
            @org.springframework.data.repository.query.Param("liveFrom") java.time.LocalDate liveFrom,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT m FROM Match m " +
                "JOIN FETCH m.tournament t " +
                "LEFT JOIN FETCH m.homeTeam ht " +
                "LEFT JOIN FETCH ht.organisation hto " +
                "LEFT JOIN FETCH m.awayTeam at " +
                "LEFT JOIN FETCH at.organisation ato " +
                "LEFT JOIN FETCH m.stage s " +
                "LEFT JOIN FETCH s.category sc " +
                "LEFT JOIN FETCH m.category c " +
                "LEFT JOIN FETCH m.tournamentVenue tv " +
                "WHERE m.deleted = false " +
                "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                "AND m.matchDate = :today " +
                "AND m.status <> com.athleticaos.backend.enums.MatchStatus.CANCELLED " +
                "ORDER BY m.matchDate ASC, m.kickOffTime ASC NULLS LAST, m.id ASC",
        countQuery = "SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                     "WHERE m.deleted = false " +
                     "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                     "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                     "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                     "AND m.matchDate = :today " +
                     "AND m.status <> com.athleticaos.backend.enums.MatchStatus.CANCELLED"
    )
    org.springframework.data.domain.Page<Match> findFeedToday(
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT m FROM Match m " +
                "JOIN FETCH m.tournament t " +
                "LEFT JOIN FETCH m.homeTeam ht " +
                "LEFT JOIN FETCH ht.organisation hto " +
                "LEFT JOIN FETCH m.awayTeam at " +
                "LEFT JOIN FETCH at.organisation ato " +
                "LEFT JOIN FETCH m.stage s " +
                "LEFT JOIN FETCH s.category sc " +
                "LEFT JOIN FETCH m.category c " +
                "LEFT JOIN FETCH m.tournamentVenue tv " +
                "WHERE m.deleted = false " +
                "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                "AND m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED " +
                "AND m.matchDate BETWEEN :from AND :today " +
                "ORDER BY m.matchDate DESC, m.kickOffTime DESC NULLS LAST, m.id DESC",
        countQuery = "SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                     "WHERE m.deleted = false " +
                     "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                     "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                     "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                     "AND m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED " +
                     "AND m.matchDate BETWEEN :from AND :today"
    )
    org.springframework.data.domain.Page<Match> findFeedResults(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT m FROM Match m " +
                "JOIN FETCH m.tournament t " +
                "LEFT JOIN FETCH m.homeTeam ht " +
                "LEFT JOIN FETCH ht.organisation hto " +
                "LEFT JOIN FETCH m.awayTeam at " +
                "LEFT JOIN FETCH at.organisation ato " +
                "LEFT JOIN FETCH m.stage s " +
                "LEFT JOIN FETCH s.category sc " +
                "LEFT JOIN FETCH m.category c " +
                "LEFT JOIN FETCH m.tournamentVenue tv " +
                "WHERE m.deleted = false " +
                "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                "AND m.status = com.athleticaos.backend.enums.MatchStatus.SCHEDULED " +
                "AND m.matchDate <= :to " +
                "AND (m.matchDate > :today OR (m.matchDate = :today AND (m.kickOffTime IS NULL OR m.kickOffTime >= :nowTime))) " +
                "ORDER BY m.matchDate ASC, m.kickOffTime ASC NULLS LAST, m.id ASC",
        countQuery = "SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                     "WHERE m.deleted = false " +
                     "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                     "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                     "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                     "AND m.status = com.athleticaos.backend.enums.MatchStatus.SCHEDULED " +
                     "AND m.matchDate <= :to " +
                     "AND (m.matchDate > :today OR (m.matchDate = :today AND (m.kickOffTime IS NULL OR m.kickOffTime >= :nowTime)))"
    )
    org.springframework.data.domain.Page<Match> findFeedUpcoming(
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
            @org.springframework.data.repository.query.Param("nowTime") java.time.LocalTime nowTime,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        value = "SELECT m FROM Match m " +
                "JOIN FETCH m.tournament t " +
                "LEFT JOIN FETCH m.homeTeam ht " +
                "LEFT JOIN FETCH ht.organisation hto " +
                "LEFT JOIN FETCH m.awayTeam at " +
                "LEFT JOIN FETCH at.organisation ato " +
                "LEFT JOIN FETCH m.stage s " +
                "LEFT JOIN FETCH s.category sc " +
                "LEFT JOIN FETCH m.category c " +
                "LEFT JOIN FETCH m.tournamentVenue tv " +
                "WHERE m.deleted = false " +
                "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                "AND m.matchDate BETWEEN :from AND :to " +
                "ORDER BY m.matchDate ASC, m.kickOffTime ASC NULLS LAST, m.id ASC",
        countQuery = "SELECT COUNT(m) FROM Match m JOIN m.tournament t " +
                     "WHERE m.deleted = false " +
                     "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
                     "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
                     "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
                     "AND m.matchDate BETWEEN :from AND :to"
    )
    org.springframework.data.domain.Page<Match> findFeedRange(
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT new com.athleticaos.backend.dtos.public_api.PublicMatchFeedCounts(" +
        "  COALESCE(SUM(CASE WHEN m.status IN (com.athleticaos.backend.enums.MatchStatus.LIVE, com.athleticaos.backend.enums.MatchStatus.ONGOING) AND m.matchDate >= :liveFrom THEN 1L ELSE 0L END), 0L), " +
        "  COALESCE(SUM(CASE WHEN m.matchDate = :today AND m.status <> com.athleticaos.backend.enums.MatchStatus.CANCELLED THEN 1L ELSE 0L END), 0L), " +
        "  COALESCE(SUM(CASE WHEN m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED AND m.matchDate BETWEEN :resultsFrom AND :today THEN 1L ELSE 0L END), 0L), " +
        "  COALESCE(SUM(CASE WHEN m.status = com.athleticaos.backend.enums.MatchStatus.SCHEDULED AND m.matchDate <= :upcomingTo AND (m.matchDate > :today OR (m.matchDate = :today AND (m.kickOffTime IS NULL OR m.kickOffTime >= :nowTime))) THEN 1L ELSE 0L END), 0L)" +
        ") FROM Match m JOIN m.tournament t " +
        "WHERE m.deleted = false " +
        "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
        "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
        "AND (:tournamentId IS NULL OR t.id = :tournamentId)"
    )
    com.athleticaos.backend.dtos.public_api.PublicMatchFeedCounts countFeed(
            @org.springframework.data.repository.query.Param("liveFrom") java.time.LocalDate liveFrom,
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
            @org.springframework.data.repository.query.Param("nowTime") java.time.LocalTime nowTime,
            @org.springframework.data.repository.query.Param("resultsFrom") java.time.LocalDate resultsFrom,
            @org.springframework.data.repository.query.Param("upcomingTo") java.time.LocalDate upcomingTo,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT new com.athleticaos.backend.dtos.public_api.PublicMatchDayResponse(" +
        "  m.matchDate, " +
        "  COUNT(m), " +
        "  COALESCE(SUM(CASE WHEN m.status IN (com.athleticaos.backend.enums.MatchStatus.LIVE, com.athleticaos.backend.enums.MatchStatus.ONGOING) AND m.matchDate >= :liveFrom THEN 1L ELSE 0L END), 0L), " +
        "  COALESCE(SUM(CASE WHEN m.status = com.athleticaos.backend.enums.MatchStatus.COMPLETED THEN 1L ELSE 0L END), 0L), " +
        "  COALESCE(SUM(CASE WHEN m.status = com.athleticaos.backend.enums.MatchStatus.CANCELLED THEN 1L ELSE 0L END), 0L)" +
        ") FROM Match m JOIN m.tournament t " +
        "WHERE m.deleted = false " +
        "AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) " +
        "AND (m.resultType IS NULL OR m.resultType <> com.athleticaos.backend.enums.MatchResultType.BYE) " +
        "AND m.matchDate BETWEEN :from AND :to " +
        "AND (:tournamentId IS NULL OR t.id = :tournamentId) " +
        "GROUP BY m.matchDate " +
        "ORDER BY m.matchDate ASC"
    )
    java.util.List<com.athleticaos.backend.dtos.public_api.PublicMatchDayResponse> findMatchDays(
            @org.springframework.data.repository.query.Param("liveFrom") java.time.LocalDate liveFrom,
            @org.springframework.data.repository.query.Param("from") java.time.LocalDate from,
            @org.springframework.data.repository.query.Param("to") java.time.LocalDate to,
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);
}
