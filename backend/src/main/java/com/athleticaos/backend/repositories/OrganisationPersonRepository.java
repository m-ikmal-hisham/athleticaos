package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.OrganisationPerson;
import com.athleticaos.backend.entities.Person;
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
    @Query("SELECT op FROM OrganisationPerson op " +
           "JOIN FETCH op.organisation " +
           "JOIN FETCH op.person " +
           "WHERE op.person.id IN :personIds")
    List<OrganisationPerson> findAllByPersonIdIn(@Param("personIds") java.util.Collection<UUID> personIds);
    
    List<OrganisationPerson> findByPersonId(UUID personId);

    @Query("SELECT DISTINCT op.person FROM OrganisationPerson op " +
           "WHERE op.organisation.id IN :orgIds")
    org.springframework.data.domain.Page<Person> findUniquePersonsByOrganisationIds(
        @Param("orgIds") java.util.Collection<UUID> orgIds, 
        org.springframework.data.domain.Pageable pageable
    );
}
