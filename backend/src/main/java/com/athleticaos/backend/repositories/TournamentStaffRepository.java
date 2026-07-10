package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TournamentStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TournamentStaffRepository extends JpaRepository<TournamentStaff, UUID> {
    List<TournamentStaff> findByTournamentTeamIdAndIsActiveTrue(UUID tournamentTeamId);
    List<TournamentStaff> findByTournamentIdAndTournamentTeamId(UUID tournamentId, UUID tournamentTeamId);
    Optional<TournamentStaff> findByTournamentTeamIdAndPersonIdAndStaffRoleId(UUID tournamentTeamId, UUID personId, Integer staffRoleId);
    boolean existsByPersonId(UUID personId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT ts.person.id FROM TournamentStaff ts WHERE ts.isActive = true AND ts.person.id IN :personIds")
    java.util.Set<UUID> findAllPersonIdsIn(@org.springframework.data.repository.query.Param("personIds") java.util.Collection<UUID> personIds);
}
