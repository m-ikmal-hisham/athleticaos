package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<Player, UUID> {
    Optional<Player> findByPersonId(UUID personId);

    List<Player> findByStatus(String status);

    List<Player> findAllByDeletedFalseOrderByCreatedAtDesc();

    boolean existsBySlug(String slug);

    Optional<Player> findBySlug(String slug);
}
