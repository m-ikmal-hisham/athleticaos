package com.athleticaos.backend.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import com.athleticaos.backend.services.UserService;
import org.springframework.security.core.userdetails.UserDetailsService;

import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import({com.athleticaos.backend.security.SecurityConfig.class, com.athleticaos.backend.exceptions.GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class UserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private com.athleticaos.backend.security.JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @MockBean
    private com.athleticaos.backend.services.PlayerService playerService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousCannotAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "PLAYER")
    void playerCannotAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "COACH")
    void coachCannotAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "TEAM_MANAGER")
    void teamManagerCannotAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void orgAdminCanAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCanAccessGetAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousCannotAccessGetUserById() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}", java.util.UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotAccessGetUserRoles() throws Exception {
        mockMvc.perform(get("/api/v1/users/{id}/roles", java.util.UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "PLAYER")
    void getUserById_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.when(userService.getUserByIdInScope(targetId))
                .thenThrow(new jakarta.persistence.EntityNotFoundException("User not found"));

        mockMvc.perform(get("/api/v1/users/{id}", targetId))
                .andExpect(status().isNotFound())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("User not found"));

        org.mockito.Mockito.verify(userService).getUserByIdInScope(targetId);
        org.mockito.Mockito.verify(userService, org.mockito.Mockito.never()).getUserById(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "PLAYER")
    void getUserRoles_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.when(userService.getUserRolesInScope(targetId))
                .thenThrow(new jakarta.persistence.EntityNotFoundException("User not found"));

        mockMvc.perform(get("/api/v1/users/{id}/roles", targetId))
                .andExpect(status().isNotFound())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("User not found"));

        org.mockito.Mockito.verify(userService).getUserRolesInScope(targetId);
        org.mockito.Mockito.verify(userService, org.mockito.Mockito.never()).getUserRoles(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void nonSuperAdminCannotResetPassword() throws Exception {
        mockMvc.perform(post("/api/v1/users/{id}/reset-password", java.util.UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"Violet-Kettle-Harbour-58\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanResetPassword() throws Exception {
        mockMvc.perform(post("/api/v1/users/{id}/reset-password", java.util.UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPassword\":\"Violet-Kettle-Harbour-58\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousCannotResendInvite() throws Exception {
        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", java.util.UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "PLAYER")
    void playerCannotResendInvite() throws Exception {
        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", java.util.UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void orgAdminResendingOutOfHierarchyGets404() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.doThrow(new jakarta.persistence.EntityNotFoundException("User not found"))
                .when(userService).resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", targetId))
                .andExpect(status().isNotFound())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("User not found"));
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void resendInviteForAcceptedUserReturns400() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.doThrow(new IllegalArgumentException("This user has already set their password."))
                .when(userService).resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", targetId))
                .andExpect(status().isBadRequest())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("This user has already set their password."));
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void resendInviteForDeactivatedUserReturns400() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.doThrow(new IllegalArgumentException("This user is deactivated."))
                .when(userService).resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", targetId))
                .andExpect(status().isBadRequest())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("This user is deactivated."));
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanResendInvite() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.when(userService.resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any()))
                .thenReturn(com.athleticaos.backend.dtos.user.InviteUserResponse.builder()
                        .message("Invite resent successfully.")
                        .emailSent(true)
                        .build());

        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", targetId))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("Invite resent successfully."));

        org.mockito.Mockito.verify(userService).resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ORG_ADMIN")
    void resendInviteRateLimitExceededReturns429() throws Exception {
        java.util.UUID targetId = java.util.UUID.randomUUID();
        org.mockito.Mockito.doThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                "Too many invitation resends. Please wait before trying again."))
                .when(userService).resendInvite(org.mockito.ArgumentMatchers.eq(targetId), org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/v1/users/{id}/resend-invite", targetId))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.status").value(429))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message")
                        .value("Too many invitation resends. Please wait before trying again."));
    }
}
