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
}
