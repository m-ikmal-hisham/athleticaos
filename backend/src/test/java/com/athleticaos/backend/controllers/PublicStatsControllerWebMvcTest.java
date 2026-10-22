package com.athleticaos.backend.controllers;

import com.athleticaos.backend.audit.AuditLogger;
import com.athleticaos.backend.config.PublicHttpCache;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PublicStatsController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class PublicStatsControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TournamentRepository tournamentRepository;

    @MockBean
    private TeamRepository teamRepository;

    @MockBean
    private PlayerRepository playerRepository;

    @MockBean
    private MatchRepository matchRepository;

    @MockBean
    private AuditLogger auditLogger;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

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
    @DisplayName("GET /api/public/stats/summary returns 200, JSON shape, Cache-Control header and requires no auth")
    public void testGetSummary() throws Exception {
        when(tournamentRepository.countPublished()).thenReturn(3L);
        when(teamRepository.countActiveTeams()).thenReturn(16L);
        when(playerRepository.countByDeletedFalse()).thenReturn(320L);
        when(matchRepository.countByStatusInPublishedTournaments(MatchStatus.COMPLETED)).thenReturn(48L);

        mockMvc.perform(get("/api/public/stats/summary"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", PublicHttpCache.CACHE_CONTROL))
                .andExpect(jsonPath("$.tournaments").value(3))
                .andExpect(jsonPath("$.teams").value(16))
                .andExpect(jsonPath("$.players").value(320))
                .andExpect(jsonPath("$.matchesPlayed").value(48));
    }
}
