package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.CompetitionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TournamentRepository extends JpaRepository<Tournament, UUID> {
    java.util.List<Tournament> findByOrganiserOrg_IdIn(java.util.Set<UUID> orgIds);

    @org.springframework.data.jpa.repository.Query("SELECT t.id FROM Tournament t WHERE t.organiserOrg.id IN :orgIds")
    java.util.Set<UUID> findIdsByOrganiserOrg_IdIn(@org.springframework.data.repository.query.Param("orgIds") java.util.Collection<UUID> orgIds);

    java.util.List<Tournament> findByIdIn(java.util.Collection<UUID> ids);

    java.util.List<Tournament> findBySeasonId(UUID seasonId);

    java.util.List<Tournament> findByCompetitionType(CompetitionType competitionType);

    java.util.List<Tournament> findByIsPublishedTrue();

    java.util.List<Tournament> findByLevel(String level);

    java.util.Optional<Tournament> findBySlug(String slug);

    long countByStatus(com.athleticaos.backend.enums.TournamentStatus status);

    long countByStatusAndDeletedFalse(com.athleticaos.backend.enums.TournamentStatus status);

    long countByStatusAndDeletedFalseAndOrganiserOrg_IdIn(com.athleticaos.backend.enums.TournamentStatus status,
            java.util.Collection<UUID> orgIds);

    // pg_advisory_xact_lock returns PostgreSQL's "void" type, which Hibernate cannot map (JDBC type 1111);
    // wrapping it makes the query return a plain integer. The lock is held until the transaction ends.
    @org.springframework.data.jpa.repository.Query(value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('tournament_featured'))) AS lock_taken", nativeQuery = true)
    Integer acquireFeaturedAdvisoryLock();

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM Tournament t WHERE t.featured = true AND (t.deleted IS NULL OR t.deleted = false) ORDER BY t.featuredOrder ASC")
    java.util.List<Tournament> findFeaturedForUpdate();

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Tournament t WHERE t.featured = true AND t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false) ORDER BY t.featuredOrder ASC")
    java.util.List<Tournament> findFeaturedPublished();

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(t) FROM Tournament t WHERE t.isPublished = true AND (t.deleted IS NULL OR t.deleted = false)")
    long countPublished();
}
