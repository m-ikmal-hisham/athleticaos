package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    Optional<Team> findBySlug(String slug);

    boolean existsBySlug(String slug);

    java.util.List<Team> findByOrganisation_IdIn(java.util.Set<UUID> orgIds);

    java.util.List<Team> findByOrganisationId(UUID organisationId);

    long countByStatus(String status);

    long countByStatusAndOrganisation_IdIn(String status, java.util.Collection<UUID> orgIds);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM Team t LEFT JOIN FETCH t.organisation WHERE t.status IS NULL OR LOWER(t.status) != 'inactive'")
    java.util.List<Team> findAllActiveWithOrganisation();
}
