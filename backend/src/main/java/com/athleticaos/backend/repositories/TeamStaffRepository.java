package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.TeamStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamStaffRepository extends JpaRepository<TeamStaff, UUID> {
    List<TeamStaff> findByTeamId(UUID teamId);
    Optional<TeamStaff> findByTeamIdAndPersonIdAndStaffRoleId(UUID teamId, UUID personId, Integer staffRoleId);
    List<TeamStaff> findByPersonId(UUID personId);
    boolean existsByPersonIdAndIsWorldRugbyCertifiedTrue(UUID personId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT ts.person.id FROM TeamStaff ts")
    java.util.Set<UUID> findAllPersonIds();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT ts.person.id FROM TeamStaff ts WHERE ts.isWorldRugbyCertified = true")
    java.util.Set<UUID> findAllWorldRugbyCertifiedPersonIds();
}
