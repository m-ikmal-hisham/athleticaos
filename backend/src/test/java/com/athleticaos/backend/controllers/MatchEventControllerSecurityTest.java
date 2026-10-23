package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.match.MatchEventCreateRequest;
import com.athleticaos.backend.dtos.match.MatchEventResponse;
import com.athleticaos.backend.dtos.match.MatchResponse;
import com.athleticaos.backend.enums.MatchEventType;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.AccessScopeService;
import com.athleticaos.backend.services.MatchEventService;
import com.athleticaos.backend.services.MatchService;
import com.athleticaos.backend.services.ProgressionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * R-1: an ORG_ADMIN may score matches of their own organisation's tournaments. The role check
 * lets ORG_ADMIN reach the event endpoints; organiser scope is still enforced in the service
 * (canWriteMatch), which answers 404 outside scope. The admin match detail tells the UI
 * whether the caller may score via canWrite.
 */
@WebMvcTest({MatchEventController.class, MatchController.class})
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
class MatchEventControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MatchEventService matchEventService;

    @MockBean
    private MatchService matchService;

    @MockBean
    private ProgressionService progressionService;

    @MockBean
    private AccessScopeService accessScopeService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    private final UUID matchId = UUID.randomUUID();
    private final UUID eventId = UUID.randomUUID();
    private String tryBody;

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());

        MatchEventCreateRequest request = new MatchEventCreateRequest();
        request.setTeamId(UUID.randomUUID());
        request.setEventType(MatchEventType.TRY);
        request.setMinute(10);
        tryBody = objectMapper.writeValueAsString(request);
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void orgAdminCanAddEventInOwnTournament() throws Exception {
        when(matchEventService.addEventToMatch(eq(matchId), any(), any())).thenReturn(new MatchEventResponse());

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void orgAdminOutsideScopeGetsNotFound() throws Exception {
        when(matchEventService.addEventToMatch(eq(matchId), any(), any()))
                .thenThrow(new EntityNotFoundException("Match not found"));

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void orgAdminCanDeleteEventInOwnTournament() throws Exception {
        when(matchEventService.deleteEvent(eq(eventId), any())).thenReturn(eventId);

        mockMvc.perform(delete("/api/v1/matches/events/{eventId}", eventId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_COACH")
    void coachCannotAddEvent() throws Exception {
        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isForbidden());
        verify(matchEventService, never()).addEventToMatch(any(), any(), any());
    }

    @Test
    void anonymousCannotAddEvent() throws Exception {
        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isForbidden());
        verify(matchEventService, never()).addEventToMatch(any(), any(), any());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void matchDetailReportsCanWriteFromScope() throws Exception {
        MatchResponse match = MatchResponse.builder().id(matchId).build();
        when(matchService.getMatchById(matchId)).thenReturn(match);
        when(accessScopeService.canReadMatch(matchId)).thenReturn(true);
        when(accessScopeService.canWriteMatch(matchId)).thenReturn(true);

        mockMvc.perform(get("/api/v1/matches/{id}", matchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canWrite").value(true));
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void matchDetailReportsReadOnlyForParticipatingClub() throws Exception {
        MatchResponse match = MatchResponse.builder().id(matchId).build();
        when(matchService.getMatchById(matchId)).thenReturn(match);
        when(accessScopeService.canReadMatch(matchId)).thenReturn(true);
        when(accessScopeService.canWriteMatch(matchId)).thenReturn(false);

        mockMvc.perform(get("/api/v1/matches/{id}", matchId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canWrite").value(false));
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPER_ADMIN")
    void superAdminCanAddEvent() throws Exception {
        when(matchEventService.addEventToMatch(eq(matchId), any(), any())).thenReturn(new MatchEventResponse());

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCanAddEvent() throws Exception {
        when(matchEventService.addEventToMatch(eq(matchId), any(), any())).thenReturn(new MatchEventResponse());

        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_PLAYER")
    void playerCannotAddEvent() throws Exception {
        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isForbidden());
        verify(matchEventService, never()).addEventToMatch(any(), any(), any());
    }

    @Test
    @WithMockUser(authorities = "ROLE_MATCH_MANAGER")
    void matchManagerCannotAddEvent() throws Exception {
        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isForbidden());
        verify(matchEventService, never()).addEventToMatch(any(), any(), any());
    }

    @Test
    @WithMockUser(authorities = "ROLE_OFFICIAL")
    void officialCannotAddEvent() throws Exception {
        mockMvc.perform(post("/api/v1/matches/{id}/events", matchId)
                        .contentType(MediaType.APPLICATION_JSON).content(tryBody))
                .andExpect(status().isForbidden());
        verify(matchEventService, never()).addEventToMatch(any(), any(), any());
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPER_ADMIN")
    void superAdminCanUpdateMatchStatus() throws Exception {
        when(matchService.updateMatchStatus(eq(matchId), eq("LIVE"), any())).thenReturn(new MatchResponse());

        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void orgAdminCanUpdateMatchStatus() throws Exception {
        when(matchService.updateMatchStatus(eq(matchId), eq("LIVE"), any())).thenReturn(new MatchResponse());

        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCanUpdateMatchStatus() throws Exception {
        when(matchService.updateMatchStatus(eq(matchId), eq("LIVE"), any())).thenReturn(new MatchResponse());

        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_COACH")
    void coachCannotUpdateMatchStatus() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_PLAYER")
    void playerCannotUpdateMatchStatus() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_MATCH_MANAGER")
    void matchManagerCannotUpdateMatchStatus() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_OFFICIAL")
    void officialCannotUpdateMatchStatus() throws Exception {
        mockMvc.perform(put("/api/v1/matches/{id}/status", matchId)
                        .param("status", "LIVE"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCanViewOperationsDashboard() throws Exception {
        when(matchService.getOperationsDashboard()).thenReturn(com.athleticaos.backend.dtos.match.OperationsDashboardDTO.builder().build());

        mockMvc.perform(get("/api/v1/matches/operations/dashboard"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_COACH")
    void coachCannotViewOperationsDashboard() throws Exception {
        mockMvc.perform(get("/api/v1/matches/operations/dashboard"))
                .andExpect(status().isForbidden());
    }
}
