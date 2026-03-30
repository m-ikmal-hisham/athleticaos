package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.OrganisationPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganisationPersonRepository extends JpaRepository<OrganisationPerson, UUID> {
    
    @Query("SELECT op FROM OrganisationPerson op WHERE op.organisation.id = :orgId " +
           "OR op.organisation.parentOrg.id = :orgId " +
           "OR op.organisation.id = (SELECT o.parentOrg.id FROM Organisation o WHERE o.id = :orgId) " +
           "ORDER BY op.person.firstName, op.person.lastName")
    List<OrganisationPerson> findByOrganisationIdOrHierarchy(@Param("orgId") UUID orgId);
    
    Optional<OrganisationPerson> findByOrganisationIdAndPersonId(UUID organisationId, UUID personId);
    
    boolean existsByOrganisationIdAndPersonId(UUID organisationId, UUID personId);
    
    List<OrganisationPerson> findAllByOrganisationIdIn(java.util.Collection<UUID> organisationIds);

    List<OrganisationPerson> findByPersonId(UUID personId);
}
