package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentVenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentVenueRepository extends JpaRepository<TournamentVenue, UUID> {

    List<TournamentVenue> findByTournamentIdAndDeletedFalseOrderByDisplayOrderAscNameAsc(UUID tournamentId);

    Optional<TournamentVenue> findByIdAndTournamentIdAndDeletedFalse(UUID id, UUID tournamentId);

    Optional<TournamentVenue> findFirstByTournamentIdAndDeletedFalseOrderByDisplayOrderAscNameAsc(UUID tournamentId);

    boolean existsByTournamentIdAndNameIgnoreCaseAndDeletedFalse(UUID tournamentId, String name);

    boolean existsByTournamentIdAndNameIgnoreCaseAndIdNotAndDeletedFalse(UUID tournamentId, String name, UUID id);

    long countByTournamentIdAndDeletedFalse(UUID tournamentId);
}
