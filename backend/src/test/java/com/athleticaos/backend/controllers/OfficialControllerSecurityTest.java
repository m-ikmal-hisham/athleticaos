package com.athleticaos.backend.controllers;

import com.athleticaos.backend.dtos.official.OfficialRegistryDTO;
import com.athleticaos.backend.dtos.official.RegisterOfficialRequest;
import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.OfficialService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OfficialController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
@SuppressWarnings("null")
public class OfficialControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OfficialService officialService;

    @MockBean
    private com.athleticaos.backend.services.MatchService matchService;

    @MockBean
    private com.athleticaos.backend.services.TournamentService tournamentService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private UserDetailsService userDetailsService;

    private final UUID officialId = UUID.randomUUID();

    @BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCanGetAllOfficials() throws Exception {
        when(officialService.getAllOfficials()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/officials"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCanGetOfficialById() throws Exception {
        when(officialService.getOfficialById(eq(officialId))).thenReturn(OfficialRegistryDTO.builder().id(officialId).build());

        mockMvc.perform(get("/api/v1/officials/{officialId}", officialId))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_CLUB_ADMIN")
    void clubAdminCannotRegisterOfficial() throws Exception {
        RegisterOfficialRequest request = new RegisterOfficialRequest(
                UUID.randomUUID(), null, null, "LEVEL_1", "REFEREE", "B123", null, false);

        mockMvc.perform(post("/api/v1/officials/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_COACH")
    void coachCannotGetAllOfficials() throws Exception {
        mockMvc.perform(get("/api/v1/officials"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = "ROLE_SUPER_ADMIN")
    void superAdminCanGetAllOfficials() throws Exception {
        when(officialService.getAllOfficials()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/officials"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "ROLE_ORG_ADMIN")
    void orgAdminCanGetAllOfficials() throws Exception {
        when(officialService.getAllOfficials()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/officials"))
                .andExpect(status().isOk());
    }
}
