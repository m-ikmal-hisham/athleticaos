package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.StaffRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffRoleRepository extends JpaRepository<StaffRole, Integer> {
    Optional<StaffRole> findByName(String name);
}
