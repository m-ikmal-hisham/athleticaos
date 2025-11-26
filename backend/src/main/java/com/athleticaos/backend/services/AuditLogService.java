package com.athleticaos.backend.services;

import com.athleticaos.backend.entities.AuditLog;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.AuditLogRepository;
import com.athleticaos.backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @SuppressWarnings("null")
    public void log(String action, String entity, UUID entityId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user != null) {
            AuditLog log = AuditLog.builder()
                    .user(user)
                    .action(action)
                    .entity(entity)
                    .entityId(entityId)
                    .build();
            auditLogRepository.save(log);
        }
    }
}
