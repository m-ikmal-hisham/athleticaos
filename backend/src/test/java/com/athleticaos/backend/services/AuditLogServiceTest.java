package com.athleticaos.backend.services;

import com.athleticaos.backend.dtos.audit.AuditLogEntry;
import com.athleticaos.backend.entities.AuditLog;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.AuditLogRepository;
import com.athleticaos.backend.repositories.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void logAsRecordsExplicitActorOnUnauthenticatedRequest() {
        User user = User.builder().id(UUID.randomUUID()).email("coach@example.com").roles(new HashSet<>()).build();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        auditLogService.logAs(user, entry(), "203.0.113.7", "test-agent");

        ArgumentCaptor<AuditLog> saved = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(saved.capture());
        assertThat(saved.getValue().getActorUserId()).isEqualTo(user.getId());
        assertThat(saved.getValue().getActionType()).isEqualTo("LOGIN_SUCCESS");
    }

    @Test
    void logFromAnonymousContextRecordsNothing() {
        // Why logAs exists: on /auth/login the SecurityContext holds the anonymous principal
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        when(userRepository.findByEmail("anonymousUser")).thenReturn(Optional.empty());

        auditLogService.log(entry(), null, null);

        verify(auditLogRepository, never()).save(any());
    }

    private static AuditLogEntry entry() {
        return AuditLogEntry.builder().actionType("LOGIN_SUCCESS").entityType("USER").build();
    }
}
