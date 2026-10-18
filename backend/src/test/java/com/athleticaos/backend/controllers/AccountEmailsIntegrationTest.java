package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.auth.AcceptInviteRequest;
import com.athleticaos.backend.dtos.auth.ForgotPasswordRequest;
import com.athleticaos.backend.dtos.auth.LoginRequest;
import com.athleticaos.backend.dtos.auth.ResetPasswordWithTokenRequest;
import com.athleticaos.backend.dtos.user.AdminPasswordResetRequest;
import com.athleticaos.backend.dtos.user.InviteUserRequest;
import com.athleticaos.backend.entities.AccountToken;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.User;
import com.athleticaos.backend.enums.AccountTokenPurpose;
import com.athleticaos.backend.repositories.AccountTokenRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.support.IntegrationTestUsers;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class AccountEmailsIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        // Invite emails ON so the email-invite path runs; JavaMailSender is a mock (no SMTP server needed)
        registry.add("app.accounts.mail-enabled", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private AccountTokenRepository tokenRepository;

    @Autowired
    private com.athleticaos.backend.services.AccountTokenService tokenService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    private Organisation testOrg;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        org.mockito.Mockito.when(mailSender.createMimeMessage())
                .thenAnswer(inv -> new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null));
        testOrg = organisationRepository.findBySlug("it-account-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("IT Account Rugby Club")
                        .orgType("CLUB")
                        .slug("it-account-org")
                        .build()));
    }

    private void restoreSuperAdminSecurityContext() {
        SecurityContextHolder.setContext(TestSecurityContextHolder.getContext());
    }

    @Test
    @DisplayName("End-to-end account lifecycle: invite without password -> accept invite -> login -> forgot password -> reset password -> login")
    void fullAccountLifecycleFlow() throws Exception {
        String userEmail = "invited-player-" + UUID.randomUUID() + "@example.test";
        String initialPassword = "Strong-Password-101!";
        String newPassword = "New-Strong-Password-202!";

        // 1. Super Admin invites user without password
        InviteUserRequest inviteRequest = InviteUserRequest.builder()
                .firstName("Test")
                .lastName("Invitee")
                .email(userEmail)
                .role("PLAYER")
                .organisationId(testOrg.getId())
                .password(null) // No password -> invite email flow
                .build();

        mockMvc.perform(post("/api/v1/users/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inviteRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailSent").value(true));

        restoreSuperAdminSecurityContext();

        User createdUser = userRepository.findByEmail(userEmail).orElseThrow();
        assertThat(createdUser.getInviteAcceptedAt()).isNull();
        assertThat(createdUser.isMustChangePassword()).isFalse();

        // 2. Generate a known raw token via tokenService for public invite testing
        String rawInviteToken = tokenService.createToken(
                createdUser, AccountTokenPurpose.INVITE, null, "127.0.0.1"
        );

        // 3. Public endpoint: check features has no-store
        mockMvc.perform(get("/api/v1/auth/features"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.accountEmails").value(true));

        // 4. Public endpoint: GET /api/v1/auth/invite?token=...
        mockMvc.perform(get("/api/v1/auth/invite").param("token", rawInviteToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.firstName").value("Test"))
                .andExpect(jsonPath("$.organisationName").value("IT Account Rugby Club"));

        // 5. A1 requirement: bad password does NOT consume token
        AcceptInviteRequest weakPasswordRequest = new AcceptInviteRequest(rawInviteToken, "weak");
        mockMvc.perform(post("/api/v1/auth/accept-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(weakPasswordRequest)))
                .andExpect(status().isBadRequest());

        // Token is still valid: accept with strong password succeeds
        AcceptInviteRequest validInviteRequest = new AcceptInviteRequest(rawInviteToken, initialPassword);
        mockMvc.perform(post("/api/v1/auth/accept-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validInviteRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Password set successfully. You can now sign in."));

        // Verify user is now accepted in DB
        User acceptedUser = userRepository.findById(createdUser.getId()).orElseThrow();
        assertThat(acceptedUser.getInviteAcceptedAt()).isNotNull();
        assertThat(acceptedUser.isMustChangePassword()).isFalse();

        // 6. User can now sign in
        LoginRequest loginRequest = new LoginRequest(userEmail, initialPassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());

        // 7. Forgot password flow
        ForgotPasswordRequest forgotRequest = new ForgotPasswordRequest(userEmail);
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgotRequest)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));

        // Generate a known reset token
        String rawResetToken = tokenService.createToken(
                acceptedUser, AccountTokenPurpose.RESET, null, "127.0.0.1"
        );

        // 8. Reset password with bad password does NOT burn token
        ResetPasswordWithTokenRequest weakReset = new ResetPasswordWithTokenRequest(rawResetToken, "short");
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(weakReset)))
                .andExpect(status().isBadRequest());

        // Reset password with valid password succeeds
        ResetPasswordWithTokenRequest validReset = new ResetPasswordWithTokenRequest(rawResetToken, newPassword);
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReset)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));

        // 9. User can login with new password
        LoginRequest newLoginRequest = new LoginRequest(userEmail, newPassword);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newLoginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString());
    }

    @Test
    @DisplayName("A3: Admin password reset invalidates unused RESET tokens and marks pending invite as accepted")
    void adminResetInvalidatesTokensAndMarksPendingInviteAccepted() throws Exception {
        String userEmail = "pending-admin-reset-" + UUID.randomUUID() + "@example.test";

        InviteUserRequest inviteRequest = InviteUserRequest.builder()
                .firstName("Pending")
                .lastName("Player")
                .email(userEmail)
                .role("PLAYER")
                .organisationId(testOrg.getId())
                .password(null)
                .build();

        mockMvc.perform(post("/api/v1/users/invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inviteRequest)))
                .andExpect(status().isOk());

        restoreSuperAdminSecurityContext();

        User user = userRepository.findByEmail(userEmail).orElseThrow();
        assertThat(user.getInviteAcceptedAt()).isNull();

        // Super Admin resets password directly
        AdminPasswordResetRequest resetRequest = AdminPasswordResetRequest.builder()
                .newPassword("Super-Admin-Reset-Password-999!")
                .build();

        mockMvc.perform(post("/api/v1/users/{id}/reset-password", user.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetRequest)))
                .andExpect(status().isOk());

        restoreSuperAdminSecurityContext();

        User updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updatedUser.getInviteAcceptedAt()).isNotNull();

        // Check that any INVITE token is now marked used
        List<AccountToken> tokens = tokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .toList();
        for (AccountToken t : tokens) {
            assertThat(t.isUsed()).isTrue();
        }
    }
}
