package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.user.AdminPasswordResetRequest;
import com.athleticaos.backend.dtos.user.InviteUserRequest;
import com.athleticaos.backend.dtos.user.InviteUserResponse;
import com.athleticaos.backend.dtos.user.UserCreateRequest;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.PasswordPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class UserServicePasswordProvisioningTest {

    private static final String STRONG_PASSWORD = "Violet-Kettle-Harbour-58";
    private static final String WEAK_PASSWORD = "short";
    private static final String SUPER_ADMIN_EMAIL = "admin-test@example.com";

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private OrganisationRepository organisationRepository;
    @Mock private AuditLogger auditLogger;
    @Mock private PlayerTeamService playerTeamService;
    @Spy  private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    @Spy  private PasswordPolicy passwordPolicy = new PasswordPolicy();

    @InjectMocks
    private UserService userService;

    private Role playerRole;

    @BeforeEach
    void setUp() {
        playerRole = Role.builder().id(1).name("ROLE_PLAYER").build();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    // --- createUser ---

    @Test
    void createUserEncodesPasswordAndSetsMustChangePassword() {
        when(userRepository.existsByEmail("player@example.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_PLAYER")).thenReturn(Optional.of(playerRole));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserCreateRequest request = UserCreateRequest.builder()
                .firstName("Test")
                .lastName("Player")
                .email("player@example.com")
                .password(STRONG_PASSWORD)
                .role("PLAYER")
                .build();

        userService.createUser(request, null);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(passwordEncoder.matches(STRONG_PASSWORD, saved.getPasswordHash())).isTrue();
        assertThat(saved.isMustChangePassword()).isTrue();
    }

    @Test
    void createUserWithWeakPasswordThrowsAndNeverSaves() {
        when(userRepository.existsByEmail("player@example.com")).thenReturn(false);

        UserCreateRequest request = UserCreateRequest.builder()
                .firstName("Test")
                .lastName("Player")
                .email("player@example.com")
                .password(WEAK_PASSWORD)
                .role("PLAYER")
                .build();

        assertThatThrownBy(() -> userService.createUser(request, null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(userRepository, never()).save(any());
    }

    // --- inviteUser ---

    @Test
    void inviteUserSetsMustChangePasswordAndDoesNotLeakPasswordInResponse() {
        setSecurityContext(SUPER_ADMIN_EMAIL);
        User superAdmin = superAdmin();
        when(userRepository.findByEmail(SUPER_ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.existsByEmail("invitee@example.com")).thenReturn(false);

        when(roleRepository.findByName("ROLE_PLAYER")).thenReturn(Optional.of(playerRole));

        UUID orgId = UUID.randomUUID();
        Organisation org = Organisation.builder().id(orgId).name("Test Club").build();
        when(organisationRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        InviteUserRequest request = InviteUserRequest.builder()
                .firstName("New")
                .lastName("User")
                .email("invitee@example.com")
                .role("PLAYER")
                .organisationId(orgId)
                .password(STRONG_PASSWORD)
                .build();

        InviteUserResponse response = userService.inviteUser(request, null);

        // Verify saved user
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(passwordEncoder.matches(STRONG_PASSWORD, saved.getPasswordHash())).isTrue();

        // Response must not leak the password
        assertThat(response.getMessage()).doesNotContain(STRONG_PASSWORD);
        assertThat(response.getInviteStatus()).isEqualTo("PENDING");
    }

    // --- resetPassword ---

    @Test
    void resetPasswordSetsMustChangeAndAudits() {
        UUID userId = UUID.randomUUID();
        User existing = User.builder()
                .id(userId)
                .email("user@example.com")
                .passwordHash(passwordEncoder.encode("Old-Strong-Pass-99"))
                .mustChangePassword(false)
                .isActive(true)
                .roles(new HashSet<>())
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminPasswordResetRequest request = AdminPasswordResetRequest.builder()
                .newPassword(STRONG_PASSWORD)
                .build();

        userService.resetPassword(userId, request, null);

        assertThat(existing.isMustChangePassword()).isTrue();
        assertThat(existing.getPasswordChangedAt()).isNotNull();
        verify(auditLogger).logPasswordReset(existing, null);
    }

    // --- helpers ---

    private User superAdmin() {
        Role role = Role.builder().id(2).name("ROLE_SUPER_ADMIN").build();
        return User.builder()
                .id(UUID.randomUUID())
                .email(SUPER_ADMIN_EMAIL)
                .passwordHash("fakehash")
                .isActive(true)
                .roles(new HashSet<>(java.util.Collections.singleton(role)))
                .build();
    }

    private void setSecurityContext(String email) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(email);
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(auth);
        SecurityContextHolder.setContext(ctx);
    }
}
