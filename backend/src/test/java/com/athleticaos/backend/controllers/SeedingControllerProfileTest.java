package com.athleticaos.backend.controllers;

import com.athleticaos.backend.exceptions.GlobalExceptionHandler;
import com.athleticaos.backend.security.JwtAuthenticationFilter;
import com.athleticaos.backend.security.SecurityConfig;
import com.athleticaos.backend.services.SeedingService;
import com.athleticaos.backend.services.impl.SeedingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SeedingControllerProfileTest {

    @Nested
    @DisplayName("Profile gate tests via ApplicationContextRunner")
    class ProfileGateTests {

        private final ApplicationContextRunner runner = new ApplicationContextRunner()
                .withBean(com.athleticaos.backend.repositories.OrganisationRepository.class, () -> org.mockito.Mockito.mock(com.athleticaos.backend.repositories.OrganisationRepository.class))
                .withBean(com.athleticaos.backend.repositories.TeamRepository.class, () -> org.mockito.Mockito.mock(com.athleticaos.backend.repositories.TeamRepository.class))
                .withBean(com.athleticaos.backend.repositories.PlayerRepository.class, () -> org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerRepository.class))
                .withBean(com.athleticaos.backend.repositories.PersonRepository.class, () -> org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PersonRepository.class))
                .withBean(com.athleticaos.backend.repositories.PlayerTeamRepository.class, () -> org.mockito.Mockito.mock(com.athleticaos.backend.repositories.PlayerTeamRepository.class))
                .withUserConfiguration(SeedingController.class, SeedingServiceImpl.class);

        @Test
        @DisplayName("When 'prod' profile is active, SeedingController and SeedingServiceImpl are NOT registered")
        void beansNotRegisteredInProdProfile() {
            runner.withPropertyValues("spring.profiles.active=prod")
                    .run(context -> {
                        assertThat(context).doesNotHaveBean(SeedingController.class);
                        assertThat(context).doesNotHaveBean(SeedingServiceImpl.class);
                    });
        }

        @Test
        @DisplayName("When non-prod profile is active (default/dev/test), SeedingController and SeedingServiceImpl ARE registered")
        void beansRegisteredInNonProdProfile() {
            runner.withPropertyValues("spring.profiles.active=dev")
                    .run(context -> {
                        assertThat(context).hasSingleBean(SeedingController.class);
                        assertThat(context).hasSingleBean(SeedingServiceImpl.class);
                    });
        }
    }

    @Nested
    @WebMvcTest(SeedingController.class)
    @Import({SecurityConfig.class, GlobalExceptionHandler.class})
    @DisplayName("Endpoint security rules under test/dev profile")
    class WebMvcEndpointSecurityTests {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private SeedingService seedingService;

        @MockBean
        private JwtAuthenticationFilter jwtAuthenticationFilter;

        @MockBean
        private UserDetailsService userDetailsService;

        @BeforeEach
        void setUp() throws Exception {
            doAnswer(invocation -> {
                jakarta.servlet.FilterChain chain = invocation.getArgument(2);
                chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
                return null;
            }).when(jwtAuthenticationFilter).doFilter(any(), any(), any());
        }

        @Test
        @DisplayName("Unauthenticated request to /api/v1/admin/seed/pilot-data returns 401 or 403")
        void seedPilotData_unauthenticated_denied() throws Exception {
            mockMvc.perform(post("/api/v1/admin/seed/pilot-data"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("Non-SUPER_ADMIN request to /api/v1/admin/seed/pilot-data returns 403 Forbidden")
        void seedPilotData_userRole_forbidden() throws Exception {
            mockMvc.perform(post("/api/v1/admin/seed/pilot-data"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("SUPER_ADMIN request to /api/v1/admin/seed/pilot-data succeeds with 200 OK")
        void seedPilotData_superAdmin_ok() throws Exception {
            mockMvc.perform(post("/api/v1/admin/seed/pilot-data"))
                    .andExpect(status().isOk());

            verify(seedingService).seedPilotData();
        }

        @Test
        @WithMockUser(roles = "USER")
        @DisplayName("Non-SUPER_ADMIN request to /api/v1/admin/seed/enrich-lineups returns 403 Forbidden")
        void seedLineups_userRole_forbidden() throws Exception {
            mockMvc.perform(post("/api/v1/admin/seed/enrich-lineups"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "SUPER_ADMIN")
        @DisplayName("SUPER_ADMIN request to /api/v1/admin/seed/enrich-lineups succeeds with 200 OK")
        void seedLineups_superAdmin_ok() throws Exception {
            mockMvc.perform(post("/api/v1/admin/seed/enrich-lineups"))
                    .andExpect(status().isOk());

            verify(seedingService).seedLineups();
        }
    }
}
