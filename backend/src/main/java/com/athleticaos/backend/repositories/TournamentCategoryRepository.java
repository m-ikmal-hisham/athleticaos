package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TournamentCategoryRepository extends JpaRepository<TournamentCategory, UUID> {
    List<TournamentCategory> findByTournamentId(UUID tournamentId);
}
