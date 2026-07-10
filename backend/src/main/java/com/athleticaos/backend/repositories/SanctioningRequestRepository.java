package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.SanctioningRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SanctioningRequestRepository extends JpaRepository<SanctioningRequest, UUID> {

    List<SanctioningRequest> findByApproverOrgId(UUID approverOrgId);

    List<SanctioningRequest> findByRequesterOrgId(UUID requesterOrgId);

    List<SanctioningRequest> findByTournamentId(UUID tournamentId);
}
