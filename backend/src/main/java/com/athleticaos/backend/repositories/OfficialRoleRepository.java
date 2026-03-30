package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.OfficialRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OfficialRoleRepository extends JpaRepository<OfficialRole, Integer> {
    Optional<OfficialRole> findByName(String name);
}
