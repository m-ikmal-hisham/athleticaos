package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.playerteam.PlayerInTeamDTO;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.PlayerTeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PlayerTeamController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class PlayerTeamControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PlayerTeamService playerTeamService;

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
    void anonymousCannotAccessGetTeamRoster() throws Exception {
        mockMvc.perform(get("/api/v1/player-teams/team/{teamId}/roster", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamRoster_whenInScope_returns200AndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        PlayerInTeamDTO player = PlayerInTeamDTO.builder().playerId(UUID.randomUUID()).firstName("Player").lastName("A").email("player.a@example.test").build();
        when(playerTeamService.getTeamRosterInScope(teamId, null)).thenReturn(List.of(player));

        mockMvc.perform(get("/api/v1/player-teams/team/{teamId}/roster", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("player.a@example.test"));

        verify(playerTeamService).getTeamRosterInScope(teamId, null);
        verify(playerTeamService, never()).getTeamRoster(any(), any());
    }

    @Test
    @WithMockUser(roles = "PLAYER")
    void getTeamRoster_whenOutOfScopeOrMissing_returns200EmptyListAndCallsInScopeMethod() throws Exception {
        UUID teamId = UUID.randomUUID();
        when(playerTeamService.getTeamRosterInScope(teamId, null)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/player-teams/team/{teamId}/roster", teamId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(playerTeamService).getTeamRosterInScope(teamId, null);
        verify(playerTeamService, never()).getTeamRoster(any(), any());
    }
}
