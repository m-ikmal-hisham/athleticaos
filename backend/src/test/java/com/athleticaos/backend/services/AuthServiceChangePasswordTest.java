package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.auth.ChangePasswordRequest;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.JwtService;
import com.athleticaos.backend.security.PasswordPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class AuthServiceChangePasswordTest {

    private static final String EMAIL = "coach@example.com";
    private static final String TEMP = "Temp-Lantern-Orchid-41";
    private static final String NEW = "Violet-Kettle-Harbour-58";

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private AuditLogger auditLogger;
    @Spy
    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    @Spy
    private PasswordPolicy passwordPolicy = new PasswordPolicy();

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email(EMAIL)
                .passwordHash(passwordEncoder.encode(TEMP))
                .mustChangePassword(true)
                .isActive(true)
                .roles(new HashSet<>())
                .build();
    }

    @Test
    void changesPasswordClearsFlagAndRevokesOlderTokens() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        authService.changePassword(new ChangePasswordRequest(EMAIL, TEMP, NEW), null);

        assertThat(passwordEncoder.matches(NEW, user.getPasswordHash())).isTrue();
        assertThat(user.isMustChangePassword()).isFalse();
        assertThat(user.getPasswordChangedAt()).isNotNull();
        verify(userRepository).save(user);
        verify(auditLogger).logPasswordChanged(user, null);
    }

    @Test
    void rejectsWrongCurrentPassword() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.changePassword(new ChangePasswordRequest(EMAIL, "Wrong-Guess-Value-12", NEW), null))
                .isInstanceOf(BadCredentialsException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsUnknownEmailWithSameError() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.changePassword(new ChangePasswordRequest(EMAIL, TEMP, NEW), null))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsReusingCurrentPassword() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.changePassword(new ChangePasswordRequest(EMAIL, TEMP, TEMP), null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsInactiveUser() {
        user.setActive(false);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.changePassword(new ChangePasswordRequest(EMAIL, TEMP, NEW), null))
                .isInstanceOf(BadCredentialsException.class);
    }
}
