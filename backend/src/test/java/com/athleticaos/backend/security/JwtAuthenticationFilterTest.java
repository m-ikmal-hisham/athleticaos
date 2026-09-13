package com.athleticaos.backend.security;

import com.athleticaos.backend.entities.Role;
import com.athleticaos.backend.entities.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class JwtAuthenticationFilterTest {

    private static final String TOKEN = "test.jwt.token";
    private static final String EMAIL = "player@example.com";

    @Mock private JwtService jwtService;
    @Mock private UserDetailsService userDetailsService;
    @Mock private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + TOKEN);
        response = new MockHttpServletResponse();
    }

    private AthleticaUserDetails activeUserDetails(boolean mustChangePassword, LocalDateTime passwordChangedAt) {
        Role role = Role.builder().id(1).name("ROLE_PLAYER").build();
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(EMAIL)
                .passwordHash("$2a$04$fakehashvalue")
                .isActive(true)
                .mustChangePassword(mustChangePassword)
                .passwordChangedAt(passwordChangedAt)
                .roles(new HashSet<>(Collections.singleton(role)))
                .build();
        return new AthleticaUserDetails(user);
    }

    private AthleticaUserDetails disabledUserDetails() {
        Role role = Role.builder().id(1).name("ROLE_PLAYER").build();
        User user = User.builder()
                .id(UUID.randomUUID())
                .email(EMAIL)
                .passwordHash("$2a$04$fakehashvalue")
                .isActive(false)
                .mustChangePassword(false)
                .roles(new HashSet<>(Collections.singleton(role)))
                .build();
        return new AthleticaUserDetails(user);
    }

    @Test
    void setsAuthenticationForActiveUserWithValidToken() throws ServletException, IOException {
        AthleticaUserDetails details = activeUserDetails(false, null);
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(details);
        when(jwtService.isTokenValid(TOKEN, details)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(EMAIL);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doesNotSetAuthenticationWhenUserIsDisabled() throws ServletException, IOException {
        AthleticaUserDetails details = disabledUserDetails();
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(details);
        when(jwtService.isTokenValid(TOKEN, details)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doesNotSetAuthenticationWhenMustChangePassword() throws ServletException, IOException {
        AthleticaUserDetails details = activeUserDetails(true, null);
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(details);
        when(jwtService.isTokenValid(TOKEN, details)).thenReturn(true);

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void doesNotSetAuthenticationWhenTokenIssuedBeforePasswordChange() throws ServletException, IOException {
        LocalDateTime changedAt = LocalDateTime.of(2026, 1, 15, 12, 0, 0);
        AthleticaUserDetails details = activeUserDetails(false, changedAt);
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(details);
        when(jwtService.isTokenValid(TOKEN, details)).thenReturn(true);
        // Token issued before the password was changed
        when(jwtService.extractIssuedAt(TOKEN)).thenReturn(
                Date.from(changedAt.minusHours(1).atZone(java.time.ZoneId.systemDefault()).toInstant()));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void setsAuthenticationWhenTokenIssuedAfterPasswordChange() throws ServletException, IOException {
        LocalDateTime changedAt = LocalDateTime.of(2026, 1, 15, 12, 0, 0);
        AthleticaUserDetails details = activeUserDetails(false, changedAt);
        when(jwtService.extractUsername(TOKEN)).thenReturn(EMAIL);
        when(userDetailsService.loadUserByUsername(EMAIL)).thenReturn(details);
        when(jwtService.isTokenValid(TOKEN, details)).thenReturn(true);
        // Token issued after the password was changed
        when(jwtService.extractIssuedAt(TOKEN)).thenReturn(
                Date.from(changedAt.plusHours(1).atZone(java.time.ZoneId.systemDefault()).toInstant()));

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        verify(filterChain).doFilter(request, response);
    }
}
