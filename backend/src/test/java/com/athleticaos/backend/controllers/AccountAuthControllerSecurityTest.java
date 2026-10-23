package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.auth.AcceptInviteRequest;
import com.athleticaos.backend.dtos.auth.ForgotPasswordRequest;
import com.athleticaos.backend.dtos.auth.InviteDetailsResponse;
import com.athleticaos.backend.dtos.auth.ResetPasswordWithTokenRequest;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.AuthService;
import com.athleticaos.backend.services.LoginAttemptService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.utils.CookieUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthenticationController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
class AccountAuthControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private CookieUtils cookieUtils;

    @MockBean
    private LoginAttemptService loginAttemptService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @DisplayName("A5 & A6: /features is public, has Cache-Control: no-store, and never touches getCurrentUser")
    void getFeaturesPublicAndNoStore() throws Exception {
        when(authService.isAccountEmailsEnabled()).thenReturn(true);

        mockMvc.perform(get("/api/v1/auth/features"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.accountEmails").value(true));

        verify(userService, never()).getCurrentUser();
    }

    @Test
    @DisplayName("A5 & A6: /invite is public, has Cache-Control: no-store, and never touches getCurrentUser")
    void getInviteDetailsPublicAndNoStore() throws Exception {
        when(authService.getInviteDetails("token-123")).thenReturn(
                new InviteDetailsResponse("dave@example.com", "Dave", "Crusaders RFC")
        );

        mockMvc.perform(get("/api/v1/auth/invite").param("token", "token-123"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.email").value("dave@example.com"))
                .andExpect(jsonPath("$.firstName").value("Dave"))
                .andExpect(jsonPath("$.organisationName").value("Crusaders RFC"));

        verify(userService, never()).getCurrentUser();
    }

    @Test
    @DisplayName("A5 & A6: /accept-invite is public, has Cache-Control: no-store, and never touches getCurrentUser")
    void acceptInvitePublicAndNoStore() throws Exception {
        AcceptInviteRequest request = new AcceptInviteRequest("token-123", "Violet-Kettle-Harbour-58");

        mockMvc.perform(post("/api/v1/auth/accept-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Password set successfully. You can now sign in."));

        verify(authService).acceptInvite(any(AcceptInviteRequest.class), any());
        verify(userService, never()).getCurrentUser();
    }

    @Test
    @DisplayName("A5 & A6: /forgot-password is public, has Cache-Control: no-store, and never touches getCurrentUser")
    void forgotPasswordPublicAndNoStore() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest("player@example.com");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("If an account exists for that email, we've sent a reset link."));

        verify(authService).forgotPassword(eq(request), any());
        verify(userService, never()).getCurrentUser();
    }

    @Test
    @DisplayName("A5 & A6: /reset-password is public, has Cache-Control: no-store, and never touches getCurrentUser")
    void resetPasswordPublicAndNoStore() throws Exception {
        ResetPasswordWithTokenRequest request = new ResetPasswordWithTokenRequest("token-456", "Violet-Kettle-Harbour-58");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.message").value("Password reset successfully. You can now sign in."));

        verify(authService).resetPasswordWithToken(any(ResetPasswordWithTokenRequest.class), any());
        verify(userService, never()).getCurrentUser();
    }
}
