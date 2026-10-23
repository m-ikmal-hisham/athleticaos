package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.support.IntegrationTestUsers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.TestSecurityContextHolder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * D2d on real PostgreSQL: the featured PATCH and the unfeature-on-unpublish path both take the
 * pg_advisory_xact_lock (skipped on H2 in unit tests), so this is the test that proves the lock query
 * runs and that ordering stays 1..n end to end.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, roles = "SUPER_ADMIN")
@SuppressWarnings("null")
public class FeaturedTournamentsIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private OrganisationRepository organisationRepository;

    @Autowired
    private TournamentRepository tournamentRepository;

    private Organisation org;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        org = organisationRepository.findBySlug("it-featured-org")
                .orElseGet(() -> organisationRepository.saveAndFlush(Organisation.builder()
                        .name("IT Featured Union")
                        .orgType("CLUB")
                        .slug("it-featured-org")
                        .build()));
        // Start every test from "nothing featured" (the container is shared across test methods)
        tournamentRepository.findAll().stream()
                .filter(Tournament::isFeatured)
                .forEach(t -> {
                    t.setFeatured(false);
                    t.setFeaturedOrder(null);
                    tournamentRepository.saveAndFlush(t);
                });
    }

    private Tournament publishedTournament(String label) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return tournamentRepository.saveAndFlush(Tournament.builder()
                .name("IT Featured " + label + " " + suffix)
                .slug("it-featured-" + label.toLowerCase() + "-" + suffix)
                .level("CLUB")
                .organiserOrg(org)
                .startDate(LocalDate.now().plusDays(7))
                .endDate(LocalDate.now().plusDays(8))
                .venue("IT Field")
                .isPublished(true)
                .build());
    }

    private void restoreSuperAdminSecurityContext() {
        SecurityContextHolder.setContext(TestSecurityContextHolder.getContext());
    }

    @Test
    @DisplayName("Feature two tournaments, reorder, then unpublish one: advisory lock runs on PostgreSQL and order stays 1..n")
    void featureReorderAndUnpublishOnPostgres() throws Exception {
        Tournament first = publishedTournament("First");
        Tournament second = publishedTournament("Second");

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", first.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.featuredOrder").value(1));

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", second.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featuredOrder").value(2));

        // Super admin moves the second one to the top
        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", second.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true,\"featuredOrder\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.featuredOrder").value(1));

        mockMvc.perform(get("/api/public/tournaments/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(second.getId().toString()))
                .andExpect(jsonPath("$[1].id").value(first.getId().toString()))
                .andExpect(jsonPath("$[0].featured").value(true));

        // Unpublishing the top one unfeatures it and closes the gap (same advisory lock path)
        mockMvc.perform(patch("/api/v1/tournaments/{id}/publish", second.getId()).param("publish", "false"))
                .andExpect(status().isOk());

        restoreSuperAdminSecurityContext();
        Tournament secondAfter = tournamentRepository.findById(second.getId()).orElseThrow();
        Tournament firstAfter = tournamentRepository.findById(first.getId()).orElseThrow();
        assertThat(secondAfter.isFeatured()).isFalse();
        assertThat(secondAfter.getFeaturedOrder()).isNull();
        assertThat(firstAfter.isFeatured()).isTrue();
        assertThat(firstAfter.getFeaturedOrder()).isEqualTo(1);

        mockMvc.perform(get("/api/public/tournaments/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(first.getId().toString()));
    }

    @Test
    @DisplayName("Featuring an unpublished tournament is refused with a clear 400")
    void unpublishedCannotBeFeatured() throws Exception {
        Tournament draft = publishedTournament("Draft");
        draft.setPublished(false);
        tournamentRepository.saveAndFlush(draft);

        mockMvc.perform(patch("/api/v1/tournaments/{id}/featured", draft.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only published tournaments can be featured."));
    }
}
