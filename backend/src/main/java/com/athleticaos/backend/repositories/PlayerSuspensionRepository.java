package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.PlayerSuspension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PlayerSuspensionRepository extends JpaRepository<PlayerSuspension, UUID> {

    List<PlayerSuspension> findByTournamentIdAndTeamIdAndIsActiveTrue(UUID tournamentId, UUID teamId);

    List<PlayerSuspension> findByTournamentIdAndPlayerIdAndIsActiveTrue(UUID tournamentId, UUID playerId);

    List<PlayerSuspension> findByTournamentIdAndIsActiveTrue(UUID tournamentId);

    List<PlayerSuspension> findByPlayerIdAndIsActiveTrue(UUID playerId);

    List<PlayerSuspension> findByTournamentId(UUID tournamentId);
}
