package com.athleticaos.backend.controllers;

import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.AuthService;
import com.athleticaos.backend.services.UserService;
import com.athleticaos.backend.utils.CookieUtils;
import com.athleticaos.backend.services.LoginAttemptService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthenticationController.class)
@Import(SecurityConfig.class)
@SuppressWarnings("null")
class AuthenticationControllerPasswordTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private UserService userService;

    @MockBean
    private CookieUtils cookieUtils;

    @MockBean
    private LoginAttemptService loginAttemptService;

    @MockBean
    private com.athleticaos.backend.security.JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

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
    void loginWithCredentialsExpiredReturns403WithPasswordChangeRequired() throws Exception {
        when(authService.login(any(), any()))
                .thenThrow(new CredentialsExpiredException("Password change required"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"password\":\"Violet-Kettle-Harbour-58\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("PASSWORD_CHANGE_REQUIRED")))
                .andExpect(header().doesNotExist("Set-Cookie"));
    }

    @Test
    void changePasswordIsReachableUnauthenticated() throws Exception {
        // change-password is permitAll — an unauthenticated request should not get 401/403 from the security chain
        when(authService.changePassword(any(), any()))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"currentPassword\":\"Wrong-Guess-Value-12\",\"newPassword\":\"Violet-Kettle-Harbour-58\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }

    @Test
    void changePasswordWithPolicyViolationReturns400() throws Exception {
        when(authService.changePassword(any(), any()))
                .thenThrow(new IllegalArgumentException("Password must be at least 12 characters"));

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@example.com\",\"currentPassword\":\"Correct-Pass-Value-99\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
    }
}
