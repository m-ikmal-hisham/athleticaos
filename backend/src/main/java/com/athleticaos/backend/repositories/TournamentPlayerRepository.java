package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentPlayerRepository extends JpaRepository<TournamentPlayer, UUID> {

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.tournament.id = :tournamentId AND tp.team.id = :teamId AND tp.player.deleted = false")
    List<TournamentPlayer> findByTournamentIdAndTeamId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId, @org.springframework.data.repository.query.Param("teamId") UUID teamId);

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.tournament.id = :tournamentId AND tp.team.id = :teamId AND tp.player.id = :playerId AND tp.player.deleted = false")
    Optional<TournamentPlayer> findByTournamentIdAndTeamIdAndPlayerId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId, @org.springframework.data.repository.query.Param("teamId") UUID teamId, @org.springframework.data.repository.query.Param("playerId") UUID playerId);

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.tournament.id = :tournamentId AND tp.player.deleted = false")
    List<TournamentPlayer> findByTournamentId(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.tournament.id = :tournamentId AND tp.isActive = true AND tp.player.deleted = false")
    List<TournamentPlayer> findByTournamentIdAndIsActiveTrue(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.tournament.id = :tournamentId AND tp.team.id = :teamId AND tp.isActive = true AND tp.player.deleted = false")
    List<TournamentPlayer> findByTournamentIdAndTeamIdAndIsActiveTrue(@org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId, @org.springframework.data.repository.query.Param("teamId") UUID teamId);

    List<TournamentPlayer> findByPlayerId(UUID playerId);

    @org.springframework.data.jpa.repository.Query("SELECT tp FROM TournamentPlayer tp WHERE tp.player.id = :playerId AND tp.isActive = true AND tp.player.deleted = false")
    List<TournamentPlayer> findByPlayerIdAndIsActiveTrue(@org.springframework.data.repository.query.Param("playerId") UUID playerId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(tp) > 0 THEN TRUE ELSE FALSE END FROM TournamentPlayer tp WHERE tp.player.person.id = :personId AND tp.player.deleted = false")
    boolean existsByPlayerPersonId(@org.springframework.data.repository.query.Param("personId") UUID personId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT tp.tournament FROM TournamentPlayer tp WHERE tp.player.id = :playerId AND tp.isActive = true AND tp.tournament.deleted = false AND tp.player.deleted = false")
    List<com.athleticaos.backend.entities.Tournament> findActiveTournamentsByPlayerId(@org.springframework.data.repository.query.Param("playerId") UUID playerId);
}
