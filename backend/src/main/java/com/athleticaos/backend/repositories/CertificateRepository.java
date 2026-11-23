package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    boolean existsByCode(String code);

    @Query("SELECT c FROM Certificate c " +
            "JOIN FETCH c.tournament t " +
            "JOIN FETCH t.organiserOrg " +
            "JOIN FETCH c.team " +
            "LEFT JOIN FETCH c.category " +
            "WHERE c.code = :code")
    Optional<Certificate> findByCodeWithDetails(@Param("code") String code);

    List<Certificate> findByTournamentId(UUID tournamentId);

    List<Certificate> findByTournamentIdAndTeamId(UUID tournamentId, UUID teamId);

    @Query("SELECT c FROM Certificate c " +
            "JOIN FETCH c.team " +
            "LEFT JOIN FETCH c.category " +
            "WHERE c.tournament.id = :tournamentId AND c.revokedAt IS NULL")
    List<Certificate> findValidByTournamentIdWithTeamAndCategory(@Param("tournamentId") UUID tournamentId);

    @Query("SELECT c FROM Certificate c " +
            "JOIN FETCH c.team " +
            "LEFT JOIN FETCH c.category " +
            "WHERE c.tournament.id = :tournamentId AND c.team.id = :teamId AND c.revokedAt IS NULL")
    List<Certificate> findValidByTournamentIdAndTeamIdWithTeamAndCategory(
            @Param("tournamentId") UUID tournamentId,
            @Param("teamId") UUID teamId);

    Optional<Certificate> findByIdAndTournamentId(UUID id, UUID tournamentId);
}
