package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.enums.CompetitionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TournamentRepository extends JpaRepository<Tournament, UUID> {
    java.util.List<Tournament> findByOrganiserOrg_IdIn(java.util.Set<UUID> orgIds);

    java.util.List<Tournament> findBySeasonId(UUID seasonId);

    java.util.List<Tournament> findByCompetitionType(CompetitionType competitionType);

    java.util.List<Tournament> findByIsPublishedTrue();

    java.util.List<Tournament> findByLevel(String level);

    java.util.Optional<Tournament> findBySlug(String slug);

    long countByStatus(com.athleticaos.backend.enums.TournamentStatus status);
}
