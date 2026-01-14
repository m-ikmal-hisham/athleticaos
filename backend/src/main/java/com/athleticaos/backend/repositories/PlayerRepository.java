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

    Optional<Player> findByPerson_Email(String email);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Player p JOIN FETCH p.person WHERE p.id = :id")
    Optional<Player> findByIdWithPerson(@org.springframework.data.repository.query.Param("id") UUID id);

    @org.springframework.data.jpa.repository.Query("SELECT p.person FROM Player p WHERE p.id = :id")
    Optional<com.athleticaos.backend.entities.Person> findPersonByPlayerId(
            @org.springframework.data.repository.query.Param("id") UUID id);

    long countByDeletedFalse();
}
