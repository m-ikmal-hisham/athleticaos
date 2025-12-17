package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentFormatConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentFormatConfigRepository extends JpaRepository<TournamentFormatConfig, UUID> {
    Optional<TournamentFormatConfig> findByTournamentId(UUID tournamentId);
}
