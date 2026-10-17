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
}
