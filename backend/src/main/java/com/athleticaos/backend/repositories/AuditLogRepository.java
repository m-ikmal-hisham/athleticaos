package com.athleticaos.backend.repositories;

import com.athleticaos.backend.entities.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);

    Page<AuditLog> findByOrganisationIdOrderByTimestampDesc(UUID organisationId, Pageable pageable);

    Page<AuditLog> findByActorUserIdOrderByTimestampDesc(UUID actorUserId, Pageable pageable);

    Page<AuditLog> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, UUID entityId, Pageable pageable);
}
