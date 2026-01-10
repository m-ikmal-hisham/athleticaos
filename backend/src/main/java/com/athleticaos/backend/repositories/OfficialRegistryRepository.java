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
}
