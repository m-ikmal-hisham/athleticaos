package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.CertificateSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateSettingsRepository extends JpaRepository<CertificateSettings, UUID> {
    Optional<CertificateSettings> findByTournamentId(UUID tournamentId);
}
