package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Organisation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface OrganisationRepository extends JpaRepository<Organisation, UUID> {
    java.util.List<Organisation> findByOrgLevel(com.athleticaos.backend.enums.OrganisationLevel level);

    java.util.List<Organisation> findByParentOrgId(UUID parentId);

    java.util.List<Organisation> findByOrgLevelAndParentOrgId(com.athleticaos.backend.enums.OrganisationLevel level,
            UUID parentId);

    java.util.Optional<Organisation> findBySlug(String slug);

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg")
    java.util.List<Organisation> findAllWithParentOrg();

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg WHERE o.id IN :ids")
    java.util.List<Organisation> findAllByIdInWithParentOrg(@org.springframework.data.repository.query.Param("ids") java.util.Collection<UUID> ids);
}
