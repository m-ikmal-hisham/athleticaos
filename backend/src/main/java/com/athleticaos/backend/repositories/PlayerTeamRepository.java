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

    List<PlayerTeam> findByTeamIdAndIsActiveTrue(UUID teamId);

    List<PlayerTeam> findByPlayerIdAndIsActiveTrue(UUID playerId);

    Optional<PlayerTeam> findByPlayerIdAndTeamId(UUID playerId, UUID teamId);

    boolean existsByPlayerIdAndTeamId(UUID playerId, UUID teamId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.isActive = true")
    List<PlayerTeam> findActiveRosterByTeamId(@Param("teamId") UUID teamId);

    @Query("SELECT pt FROM PlayerTeam pt WHERE pt.player.id = :playerId AND pt.isActive = true")
    List<PlayerTeam> findActiveTeamsByPlayerId(@Param("playerId") UUID playerId);

    @Query("SELECT DISTINCT pt.player FROM PlayerTeam pt WHERE pt.team.organisation.id IN :orgIds AND pt.isActive = true ORDER BY pt.player.createdAt DESC")
    List<com.athleticaos.backend.entities.Player> findPlayersByOrganisationIds(
            @Param("orgIds") java.util.Set<UUID> orgIds);

    @Query("SELECT DISTINCT pt.player FROM PlayerTeam pt WHERE pt.team.id = :teamId AND pt.isActive = true")
    List<com.athleticaos.backend.entities.Player> findPlayersByTeamId(@Param("teamId") UUID teamId);

    long countByTeamId(UUID teamId);
}
