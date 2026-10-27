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

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg WHERE o.deleted = false AND (o.status IS NULL OR LOWER(o.status) = 'active')")
    java.util.List<Organisation> findAllActiveNonDeletedWithParentOrg();

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg WHERE o.slug = :slug")
    java.util.Optional<Organisation> findBySlugWithParentOrg(@org.springframework.data.repository.query.Param("slug") String slug);

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg WHERE o.id = :id")
    java.util.Optional<Organisation> findByIdWithParentOrg(@org.springframework.data.repository.query.Param("id") UUID id);

    @org.springframework.data.jpa.repository.Query("SELECT o FROM Organisation o LEFT JOIN FETCH o.parentOrg WHERE o.id IN :ids")
    java.util.List<Organisation> findAllByIdInWithParentOrg(@org.springframework.data.repository.query.Param("ids") java.util.Collection<UUID> ids);
}
