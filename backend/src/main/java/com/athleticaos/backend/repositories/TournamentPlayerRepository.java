package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentPlayerRepository extends JpaRepository<TournamentPlayer, UUID> {

    List<TournamentPlayer> findByTournamentIdAndTeamId(UUID tournamentId, UUID teamId);

    Optional<TournamentPlayer> findByTournamentIdAndTeamIdAndPlayerId(UUID tournamentId, UUID teamId, UUID playerId);

    List<TournamentPlayer> findByTournamentId(UUID tournamentId);

    List<TournamentPlayer> findByTournamentIdAndIsActiveTrue(UUID tournamentId);

    List<TournamentPlayer> findByTournamentIdAndTeamIdAndIsActiveTrue(UUID tournamentId, UUID teamId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(tp) > 0 THEN TRUE ELSE FALSE END FROM TournamentPlayer tp WHERE tp.player.person.id = :personId")
    boolean existsByPlayerPersonId(@org.springframework.data.repository.query.Param("personId") UUID personId);
}
