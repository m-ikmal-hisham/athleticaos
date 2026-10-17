package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentOfficial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentOfficialRepository extends JpaRepository<TournamentOfficial, UUID> {
    List<TournamentOfficial> findByTournamentIdAndIsActiveTrue(UUID tournamentId);
    List<TournamentOfficial> findByTournamentId(UUID tournamentId);
    Optional<TournamentOfficial> findByTournamentIdAndOfficialId(UUID tournamentId, UUID officialId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(to) > 0 THEN TRUE ELSE FALSE END FROM TournamentOfficial to WHERE to.official.person.id = :personId")
    boolean existsByOfficialPersonId(@org.springframework.data.repository.query.Param("personId") UUID personId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(to) > 0 THEN TRUE ELSE FALSE END FROM TournamentOfficial to " +
            "JOIN to.official off LEFT JOIN off.user u LEFT JOIN off.person p " +
            "WHERE to.tournament.id = :tournamentId AND to.isActive = true AND " +
            "(u.id = :userId OR p.userId = :userId)")
    boolean isUserAssignedToTournament(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
                                       @org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT to.tournament.id FROM TournamentOfficial to " +
            "JOIN to.official off LEFT JOIN off.user u LEFT JOIN off.person p " +
            "WHERE to.isActive = true AND (u.id = :userId OR p.userId = :userId)")
    java.util.List<UUID> findTournamentIdsByAssignedUser(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
