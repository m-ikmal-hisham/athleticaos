package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.SponsorPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SponsorPackageRepository extends JpaRepository<SponsorPackage, UUID> {
    List<SponsorPackage> findByActiveTrue();
}
