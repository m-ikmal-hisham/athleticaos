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
}
