package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<Player, UUID>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Player> {
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

    @org.springframework.data.jpa.repository.Query("SELECT p.person.id FROM Player p WHERE p.deleted = false AND p.person.id IN :personIds")
    java.util.Set<UUID> findAllPersonIdsIn(@org.springframework.data.repository.query.Param("personIds") java.util.Collection<UUID> personIds);

    @org.springframework.data.jpa.repository.Query("SELECT p.person.id FROM Player p WHERE p.deleted = false")
    java.util.Set<UUID> findAllPersonIds();

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Player p JOIN FETCH p.person WHERE p.deleted = false ORDER BY p.createdAt DESC")
    List<Player> findAllWithPersonByDeletedFalseOrderByCreatedAtDesc();

    /** Raw (untrimmed, possibly duplicate-by-case) states of non-deleted players, for the public filter dropdown. */
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT pe.state FROM Player p JOIN p.person pe WHERE p.deleted = false AND pe.state IS NOT NULL")
    List<String> findDistinctStatesOfActivePlayers();
}
