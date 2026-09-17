package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.dtos.player.PlayerResponse;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.PlayerService;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PlayerController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class PlayerControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlayerService playerService;

    @MockBean
    private PlayerRepository playerRepository;

    @MockBean
    private AuditLogger auditLogger;

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
    void anonymousCannotAccessGetPlayerById() throws Exception {
        mockMvc.perform(get("/api/v1/players/{idOrSlug}", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getPlayerById_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        UUID playerId = UUID.randomUUID();
        when(playerService.getPlayerInScope(playerId.toString()))
                .thenThrow(new EntityNotFoundException("Player not found"));

        mockMvc.perform(get("/api/v1/players/{idOrSlug}", playerId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player not found"));

        verify(playerService).getPlayerInScope(playerId.toString());
        verify(playerService, never()).getPlayerById(any());
        verify(playerService, never()).getPlayerBySlug(any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getPlayerById_bySlug_whenOutOfScopeOrMissing_returns404AndCallsInScopeMethod() throws Exception {
        String slug = "player-a";
        when(playerService.getPlayerInScope(slug))
                .thenThrow(new EntityNotFoundException("Player not found"));

        mockMvc.perform(get("/api/v1/players/{idOrSlug}", slug))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player not found"));

        verify(playerService).getPlayerInScope(slug);
        verify(playerService, never()).getPlayerById(any());
        verify(playerService, never()).getPlayerBySlug(any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getPlayerById_whenInScope_returns200() throws Exception {
        UUID playerId = UUID.randomUUID();
        PlayerResponse mockResponse = PlayerResponse.builder()
                .id(playerId)
                .slug("player-a")
                .firstName("Player")
                .lastName("A")
                .status("ACTIVE")
                .build();

        when(playerService.getPlayerInScope(playerId.toString())).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/players/{idOrSlug}", playerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(playerId.toString()));

        verify(playerService).getPlayerInScope(playerId.toString());
    }

    @Test
    @WithMockUser(roles = "CLUB_ADMIN")
    void updatePlayer_whenOutOfScopeOrMissing_returns404AndWritesNoAudit() throws Exception {
        UUID playerId = UUID.randomUUID();
        when(playerService.updatePlayer(eq(playerId), any()))
                .thenThrow(new EntityNotFoundException("Player not found"));

        mockMvc.perform(put("/api/v1/players/{idOrSlug}", playerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"heightCm\": 180}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player not found"));

        verify(playerService).updatePlayer(eq(playerId), any());
        verify(auditLogger, never()).logPlayerUpdated(any(), any());
    }

    @Test
    @WithMockUser(roles = "CLUB_ADMIN")
    void deletePlayer_whenOutOfScopeOrMissing_returns404AndWritesNoAudit() throws Exception {
        UUID playerId = UUID.randomUUID();
        doThrow(new EntityNotFoundException("Player not found")).when(playerService).deletePlayer(playerId);

        mockMvc.perform(delete("/api/v1/players/{idOrSlug}", playerId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Player not found"));

        verify(playerService).deletePlayer(playerId);
        verify(auditLogger, never()).logPlayerDeleted(any(), any());
    }
}
