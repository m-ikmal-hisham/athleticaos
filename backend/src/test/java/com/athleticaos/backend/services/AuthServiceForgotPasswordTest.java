package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.auth.ForgotPasswordRequest;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.JwtService;
import com.athleticaos.backend.security.PasswordPolicy;
import com.athleticaos.backend.services.mail.AccountMailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AuthServiceForgotPasswordTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Spy private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Spy private PasswordPolicy passwordPolicy = new PasswordPolicy();
    @Mock private AuditLogger auditLogger;
    @Mock private AccountTokenService accountTokenService;
    @Mock private AccountMailService accountMailService;
    @Mock private AccountRateLimiter accountRateLimiter;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private Executor accountMailExecutor;

    @InjectMocks
    private AuthService authService;

    private User activeUser;

    @BeforeEach
    void setUp() {
        activeUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .firstName("Alice")
                .lastName("Smith")
                .isActive(true)
                .inviteAcceptedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void forgotPasswordSubmitsEmailOffRequestThread() {
        when(accountRateLimiter.tryAcquireForgotPassword(eq("user@example.com"), anyString())).thenReturn(true);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(activeUser));
        when(accountMailService.isMailEnabled()).thenReturn(true);
        when(accountTokenService.createToken(eq(activeUser), eq(AccountTokenPurpose.RESET), any(), anyString()))
                .thenReturn("raw-reset-token-12345");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        authService.forgotPassword(new ForgotPasswordRequest("user@example.com"), request);

        // Verify accountMailService was NOT called synchronously on request thread
        verify(accountMailService, never()).sendPasswordResetEmail(any(), any());

        // Verify runnable was submitted to the dedicated executor
        ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(accountMailExecutor).execute(runnableCaptor.capture());

        // Running the captured task executes the mail send asynchronously
        runnableCaptor.getValue().run();
        verify(accountMailService).sendPasswordResetEmail(activeUser, "raw-reset-token-12345");
        verify(auditLogger).logPasswordResetRequested(eq(activeUser), eq(request));
    }

    @Test
    void forgotPasswordUnknownAccountRunsDummyHashWithoutExecutorOrTokenCreation() {
        when(accountRateLimiter.tryAcquireForgotPassword(eq("unknown@example.com"), anyString())).thenReturn(true);
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        MockHttpServletRequest request = new MockHttpServletRequest();
        authService.forgotPassword(new ForgotPasswordRequest("unknown@example.com"), request);

        verify(accountTokenService, never()).createToken(any(), any(), any(), any());
        verify(accountMailExecutor, never()).execute(any());
        verify(accountMailService, never()).sendPasswordResetEmail(any(), any());
        verify(passwordEncoder).encode("dummy-password-timing-defense");
    }
}
