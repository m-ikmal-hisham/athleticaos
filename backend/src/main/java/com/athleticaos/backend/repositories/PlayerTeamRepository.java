package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.PlayerTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlayerTeamRepository extends JpaRepository<PlayerTeam, UUID> {

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.isActive = true AND pt.player.deleted = false")
    List<PlayerTeam> findByTeamIdAndIsActiveTrue(@Param("teamId") UUID teamId);

    List<PlayerTeam> findByPlayerId(UUID playerId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.player.id = :playerId AND pt.isActive = true AND pt.player.deleted = false")
    List<PlayerTeam> findByPlayerIdAndIsActiveTrue(@Param("playerId") UUID playerId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.player.id = :playerId AND pt.team.id = :teamId AND pt.player.deleted = false")
    Optional<PlayerTeam> findByPlayerIdAndTeamId(@Param("playerId") UUID playerId, @Param("teamId") UUID teamId);

    @Query("SELECT CASE WHEN COUNT(pt) > 0 THEN true ELSE false END FROM PlayerTeam pt WHERE pt.player.id = :playerId AND pt.team.id = :teamId AND pt.player.deleted = false")
    boolean existsByPlayerIdAndTeamId(@Param("playerId") UUID playerId, @Param("teamId") UUID teamId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.isActive = true AND pt.player.deleted = false")
    List<PlayerTeam> findActiveRosterByTeamId(@Param("teamId") UUID teamId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.player.id = :playerId AND pt.isActive = true AND pt.player.deleted = false")
    List<PlayerTeam> findActiveTeamsByPlayerId(@Param("playerId") UUID playerId);

    @Query("SELECT DISTINCT pt.player FROM PlayerTeam pt WHERE pt.team.organisation.id IN :orgIds AND pt.isActive = true AND pt.player.deleted = false ORDER BY pt.player.createdAt DESC")
    List<com.athleticaos.backend.entities.Player> findPlayersByOrganisationIds(
            @Param("orgIds") java.util.Set<UUID> orgIds);

    @Query("SELECT DISTINCT pt.player FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.isActive = true AND pt.player.deleted = false")
    List<com.athleticaos.backend.entities.Player> findPlayersByTeamId(@Param("teamId") UUID teamId);

    @Query("SELECT COUNT(pt) FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.player.deleted = false")
    long countByTeamId(@Param("teamId") UUID teamId);
}
