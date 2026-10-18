package com.athleticaos.backend.services;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.user.AdminPasswordResetRequest;
import com.athleticaos.backend.dtos.user.InviteUserRequest;
import com.athleticaos.backend.dtos.user.InviteUserResponse;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.security.PasswordPolicy;
import com.athleticaos.backend.services.mail.AccountMailService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@SuppressWarnings("null")
class UserServiceAccountEmailsTest {

    private static final String STRONG_PASSWORD = "Violet-Kettle-Harbour-58";
    private static final String ADMIN_EMAIL = "superadmin@athleticaos.com";

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private OrganisationRepository organisationRepository;
    @Mock private AuditLogger auditLogger;
    @Mock private PlayerTeamService playerTeamService;
    @Mock private AccountTokenService accountTokenService;
    @Mock private AccountMailService accountMailService;
    @Mock private AccountRateLimiter accountRateLimiter;
    @Spy  private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    @Spy  private PasswordPolicy passwordPolicy = new PasswordPolicy();

    @InjectMocks
    private UserService userService;

    private Role coachRole;
    private Organisation rugbyOrg;
    private User superAdmin;

    @BeforeEach
    void setUp() {
        coachRole = Role.builder().id(2).name("ROLE_COACH").build();
        rugbyOrg = Organisation.builder().id(UUID.randomUUID()).name("Crusaders RFC").build();

        superAdmin = User.builder()
                .id(UUID.randomUUID())
                .email(ADMIN_EMAIL)
                .firstName("Super")
                .lastName("Admin")
                .isActive(true)
                .roles(new HashSet<>(Set.of(Role.builder().id(1).name("ROLE_SUPER_ADMIN").build())))
                .build();

        Authentication auth = mock(Authentication.class);
        lenient().when(auth.getName()).thenReturn(ADMIN_EMAIL);
        SecurityContext secContext = mock(SecurityContext.class);
        lenient().when(secContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(secContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Regression A6: invite WITH password sets mustChangePassword=true, inviteAcceptedAt=now, emailSent=false")
    void inviteWithPasswordRegression() {
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.existsByEmail("invited@example.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_COACH")).thenReturn(Optional.of(coachRole));
        when(organisationRepository.findById(rugbyOrg.getId())).thenReturn(Optional.of(rugbyOrg));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        InviteUserRequest request = InviteUserRequest.builder()
                .firstName("Dave")
                .lastName("Coach")
                .email("invited@example.com")
                .role("COACH")
                .organisationId(rugbyOrg.getId())
                .password(STRONG_PASSWORD)
                .build();

        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        InviteUserResponse response = userService.inviteUser(request, httpReq);

        assertThat(response.isEmailSent()).isFalse();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.isMustChangePassword()).isTrue();
        assertThat(saved.getInviteAcceptedAt()).isNotNull();
        assertThat(passwordEncoder.matches(STRONG_PASSWORD, saved.getPasswordHash())).isTrue();

        // No token or email dispatched
        verify(accountTokenService, never()).createToken(any(), any(), any(), any());
        verify(accountMailService, never()).sendInviteEmail(any(), any(), any());
    }

    @Test
    @DisplayName("invite WITHOUT password while invite emails are off is refused with a clear message (no null hashing)")
    void inviteWithoutPasswordWhenMailDisabledIsRefused() {
        org.mockito.Mockito.lenient().when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        org.mockito.Mockito.lenient().when(userRepository.existsByEmail("invited@example.com")).thenReturn(false);
        org.mockito.Mockito.lenient().when(roleRepository.findByName("ROLE_COACH")).thenReturn(Optional.of(coachRole));
        org.mockito.Mockito.lenient().when(organisationRepository.findById(rugbyOrg.getId())).thenReturn(Optional.of(rugbyOrg));
        org.mockito.Mockito.lenient().when(accountMailService.isMailEnabled()).thenReturn(false);

        InviteUserRequest request = InviteUserRequest.builder()
                .firstName("Dave")
                .lastName("Coach")
                .email("invited@example.com")
                .role("COACH")
                .organisationId(rugbyOrg.getId())
                .password(null)
                .build();

        assertThatThrownBy(() -> userService.inviteUser(request, mock(HttpServletRequest.class)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Password is required when invite emails are switched off.");
        verify(userRepository, org.mockito.Mockito.never()).save(any(User.class));
    }

    @Test
    @DisplayName("invite WITHOUT password creates token, dispatches email, leaves inviteAcceptedAt=null and emailSent=true")
    void inviteWithoutPasswordFlow() {
        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.existsByEmail("invited@example.com")).thenReturn(false);
        when(roleRepository.findByName("ROLE_COACH")).thenReturn(Optional.of(coachRole));
        when(organisationRepository.findById(rugbyOrg.getId())).thenReturn(Optional.of(rugbyOrg));
        when(accountMailService.isMailEnabled()).thenReturn(true);
        when(accountTokenService.createToken(any(), eq(AccountTokenPurpose.INVITE), any(), any()))
                .thenReturn("raw-token-12345");
        when(accountMailService.sendInviteEmail(any(), eq("raw-token-12345"), eq(superAdmin))).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        InviteUserRequest request = InviteUserRequest.builder()
                .firstName("Dave")
                .lastName("Coach")
                .email("invited@example.com")
                .role("COACH")
                .organisationId(rugbyOrg.getId())
                .password(null) // No password
                .build();

        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        InviteUserResponse response = userService.inviteUser(request, httpReq);

        assertThat(response.isEmailSent()).isTrue();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User saved = captor.getValue();
        assertThat(saved.isMustChangePassword()).isFalse();
        assertThat(saved.getInviteAcceptedAt()).isNull(); // Pending invite
        assertThat(saved.getPasswordHash()).isNotBlank(); // Random unguessable hash set

        verify(accountTokenService).createToken(eq(saved), eq(AccountTokenPurpose.INVITE), eq(superAdmin), any());
        verify(accountMailService).sendInviteEmail(eq(saved), eq("raw-token-12345"), eq(superAdmin));
        verify(auditLogger).logUserInviteSent(eq(saved), eq(httpReq));
    }

    @Test
    @DisplayName("A2: resendInvite refuses deactivated user with 400 'This user is deactivated.'")
    void resendInviteRefusesDeactivatedUser() {
        UUID targetId = UUID.randomUUID();
        User deactivated = User.builder()
                .id(targetId)
                .email("deactivated@example.com")
                .firstName("Old")
                .lastName("User")
                .isActive(false) // Deactivated
                .inviteAcceptedAt(null)
                .organisation(rugbyOrg)
                .build();

        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(deactivated));

        HttpServletRequest httpReq = mock(HttpServletRequest.class);

        assertThatThrownBy(() -> userService.resendInvite(targetId, httpReq))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This user is deactivated.");

        verify(accountTokenService, never()).createToken(any(), any(), any(), any());
    }

    @Test
    @DisplayName("resendInvite refuses user who already accepted invite with 400")
    void resendInviteRefusesAcceptedUser() {
        UUID targetId = UUID.randomUUID();
        User accepted = User.builder()
                .id(targetId)
                .email("accepted@example.com")
                .firstName("Active")
                .lastName("User")
                .isActive(true)
                .inviteAcceptedAt(LocalDateTime.now().minusDays(1)) // Already accepted
                .organisation(rugbyOrg)
                .build();

        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(accepted));

        HttpServletRequest httpReq = mock(HttpServletRequest.class);

        assertThatThrownBy(() -> userService.resendInvite(targetId, httpReq))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("This user has already set their password.");

        verify(accountTokenService, never()).createToken(any(), any(), any(), any());
    }

    @Test
    @DisplayName("resendInvite returns 429 when rate limit exceeded")
    void resendInviteRateLimited() {
        UUID targetId = UUID.randomUUID();
        User pending = User.builder()
                .id(targetId)
                .email("pending@example.com")
                .firstName("Pending")
                .lastName("User")
                .isActive(true)
                .inviteAcceptedAt(null)
                .organisation(rugbyOrg)
                .build();

        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(pending));
        when(accountRateLimiter.tryAcquireResendInvite(targetId)).thenReturn(false);

        HttpServletRequest httpReq = mock(HttpServletRequest.class);

        assertThatThrownBy(() -> userService.resendInvite(targetId, httpReq))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

        verify(accountTokenService, never()).createToken(any(), any(), any(), any());
    }

    @Test
    @DisplayName("resendInvite happy path: invalidates earlier tokens, generates new token, dispatches mail, and audits")
    void resendInviteSuccess() {
        UUID targetId = UUID.randomUUID();
        User pending = User.builder()
                .id(targetId)
                .email("pending@example.com")
                .firstName("Pending")
                .lastName("User")
                .isActive(true)
                .inviteAcceptedAt(null)
                .organisation(rugbyOrg)
                .build();

        when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(superAdmin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(pending));
        when(accountRateLimiter.tryAcquireResendInvite(targetId)).thenReturn(true);
        when(accountTokenService.createToken(eq(pending), eq(AccountTokenPurpose.INVITE), eq(superAdmin), any()))
                .thenReturn("new-token-456");

        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        userService.resendInvite(targetId, httpReq);

        verify(accountTokenService).createToken(eq(pending), eq(AccountTokenPurpose.INVITE), eq(superAdmin), any());
        verify(accountMailService).sendInviteEmail(eq(pending), eq("new-token-456"), eq(superAdmin));
        verify(auditLogger).logUserInviteResent(eq(pending), eq(httpReq));
    }

    @Test
    @DisplayName("A3: Admin resetPassword invalidates unused RESET tokens; if pending invite, sets inviteAcceptedAt=now and invalidates INVITE tokens")
    void adminResetPasswordInvalidatesTokensAndMarksInviteAccepted() {
        UUID targetId = UUID.randomUUID();
        User pendingInviteUser = User.builder()
                .id(targetId)
                .email("pending@example.com")
                .firstName("Pending")
                .lastName("User")
                .isActive(true)
                .inviteAcceptedAt(null) // Pending invite
                .organisation(rugbyOrg)
                .build();

        when(userRepository.findById(targetId)).thenReturn(Optional.of(pendingInviteUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminPasswordResetRequest resetRequest = AdminPasswordResetRequest.builder()
                .newPassword(STRONG_PASSWORD)
                .build();

        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        userService.resetPassword(targetId, resetRequest, httpReq);

        // A3: Invalidate RESET tokens
        verify(accountTokenService).invalidateUnusedTokens(pendingInviteUser, AccountTokenPurpose.RESET);

        // A3: Because inviteAcceptedAt was null, inviteAcceptedAt is set to now, and INVITE tokens are invalidated
        assertThat(pendingInviteUser.getInviteAcceptedAt()).isNotNull();
        verify(accountTokenService).invalidateUnusedTokens(pendingInviteUser, AccountTokenPurpose.INVITE);
    }
}
