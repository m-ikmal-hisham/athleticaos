package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TournamentTeamRepository extends JpaRepository<TournamentTeam, UUID> {
    java.util.List<TournamentTeam> findByTournamentId(UUID tournamentId);

    java.util.Optional<TournamentTeam> findFirstByTournamentIdAndTeamId(UUID tournamentId, UUID teamId);

    @org.springframework.data.jpa.repository.Query("SELECT tt FROM TournamentTeam tt JOIN FETCH tt.team t LEFT JOIN FETCH t.organisation WHERE tt.tournament.id = :tournamentId")
    java.util.List<TournamentTeam> findByTournamentIdWithTeamAndOrganisation(
            @org.springframework.data.repository.query.Param("tournamentId") UUID tournamentId);
}
