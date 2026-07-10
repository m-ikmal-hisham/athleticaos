package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.OfficialRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfficialRegistryRepository extends JpaRepository<OfficialRegistry, UUID> {
    Optional<OfficialRegistry> findByUserId(UUID userId);

    Optional<OfficialRegistry> findByBadgeNumber(String badgeNumber);

    Optional<OfficialRegistry> findByPersonId(UUID personId);
    boolean existsByPersonIdAndIsWorldRugbyCertifiedTrue(UUID personId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o.person.id FROM OfficialRegistry o WHERE o.isActive = true AND o.person.id IN :personIds")
    java.util.Set<UUID> findAllPersonIdsIn(@org.springframework.data.repository.query.Param("personIds") java.util.Collection<UUID> personIds);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o.person.id FROM OfficialRegistry o WHERE o.isWorldRugbyCertified = true AND o.person.id IN :personIds")
    java.util.Set<UUID> findAllWorldRugbyCertifiedPersonIdsIn(@org.springframework.data.repository.query.Param("personIds") java.util.Collection<UUID> personIds);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o.person.id FROM OfficialRegistry o")
    java.util.Set<UUID> findAllPersonIds();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o.person.id FROM OfficialRegistry o WHERE o.isWorldRugbyCertified = true")
    java.util.Set<UUID> findAllWorldRugbyCertifiedPersonIds();
}
