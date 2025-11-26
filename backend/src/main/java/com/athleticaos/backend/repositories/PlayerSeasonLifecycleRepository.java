package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.PlayerSeasonLifecycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PlayerSeasonLifecycleRepository extends JpaRepository<PlayerSeasonLifecycle, UUID> {
}
