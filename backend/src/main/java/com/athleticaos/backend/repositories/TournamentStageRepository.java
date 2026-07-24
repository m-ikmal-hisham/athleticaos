package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentStageRepository extends JpaRepository<TournamentStage, UUID> {

    List<TournamentStage> findByTournamentIdOrderByDisplayOrderAsc(UUID tournamentId);

    List<TournamentStage> findByTournamentIdAndCategoryId(UUID tournamentId, UUID categoryId);

    void deleteByTournamentId(UUID tournamentId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM TournamentStage s WHERE s.tournament.id = :tournamentId AND s.category.id = :categoryId")
    void deleteByTournamentIdAndCategoryId(
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId,
            @org.springframework.data.repository.query.Param("categoryId") UUID categoryId);

    void deleteByTournamentIdAndCategoryIsNull(UUID tournamentId);

    boolean existsByTournamentIdAndStageTypeAndCategoryId(UUID tournamentId,
            com.athleticaos.backend.enums.TournamentStageType stageType, UUID categoryId);

    boolean existsByTournamentIdAndStageTypeAndCategoryIsNull(UUID tournamentId,
            com.athleticaos.backend.enums.TournamentStageType stageType);
}
