package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.roster.MatchLineupUpdateRequest;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.MatchLineupService;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.TournamentRosterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MatchLineupController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class MatchLineupControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TournamentRosterService rosterService;

    @MockBean
    private MatchService matchService;

    @MockBean
    private MatchLineupService matchLineupService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    private final UUID matchId = UUID.randomUUID();
    private MatchLineupUpdateRequest updateRequest;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        updateRequest = MatchLineupUpdateRequest.builder()
                .teamId(UUID.randomUUID())
                .entries(Collections.emptyList())
                .build();
    }

    // --- Anonymous Access (403) ---

    @Test
    void anonymousCannotUpdateLineup() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    // --- Forbidden Roles (403) ---

    @Test
    @WithMockUser(roles = "PLAYER")
    void playerCannotUpdateLineup() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "COACH")
    void coachCannotUpdateLineup() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "TEAM_MANAGER")
    void teamManagerCannotUpdateLineup() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    // --- Allowed Roles (200) ---

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    void superAdminCanUpdateLineup() throws Exception {
        when(matchLineupService.updateLineup(eq(matchId), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "MATCH_MANAGER")
    void matchManagerCanUpdateLineup() throws Exception {
        when(matchLineupService.updateLineup(eq(matchId), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CLUB_ADMIN")
    void clubAdminCanUpdateLineup() throws Exception {
        when(matchLineupService.updateLineup(eq(matchId), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "OFFICIAL")
    void officialCanUpdateLineup() throws Exception {
        when(matchLineupService.updateLineup(eq(matchId), any())).thenReturn(List.of());

        mockMvc.perform(put("/api/v1/matches/{matchIdOrSlug}/lineup", matchId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());
    }
}
