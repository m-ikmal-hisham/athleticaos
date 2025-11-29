package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentStageRepository extends JpaRepository<TournamentStage, UUID> {

    List<TournamentStage> findByTournamentIdOrderByDisplayOrderAsc(UUID tournamentId);

    void deleteByTournamentId(UUID tournamentId);
}
