package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.OrganisationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
public class OrganisationSlugBackfillIntegrationTest {

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
    private OrganisationRepository organisationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> createdOrgIds = new ArrayList<>();

    @AfterEach
    void tearDown() {
        for (UUID id : createdOrgIds) {
            try {
                organisationRepository.deleteById(id);
            } catch (Exception ignored) {
            }
        }
        createdOrgIds.clear();
    }

    @Test
    @DisplayName("V170 backfill resolves null/blank slugs, appends id suffix on clashes, preserves existing slugs, and public API resolves new slug")
    void v170Migration_backfillsSlugsAndResolvesClashes() throws Exception {
        // 1. Insert an existing organisation with a known slug
        Organisation existingOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Apex Titans RFC")
                .slug("apex-titans-rfc")
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .status("Active")
                .deleted(false)
                .build());
        createdOrgIds.add(existingOrg.getId());

        // 2. Insert organisation with NULL slug that clashes in name with existingOrg
        Organisation clashingOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Apex Titans RFC")
                .slug(null)
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .status("Active")
                .deleted(false)
                .build());
        createdOrgIds.add(clashingOrg.getId());

        // 3. Insert organisation with blank whitespace slug
        Organisation blankSlugOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Blank Slugs Association")
                .slug("   ")
                .orgType("ASSOCIATION")
                .orgLevel(OrganisationLevel.STATE)
                .status("Active")
                .deleted(false)
                .build());
        createdOrgIds.add(blankSlugOrg.getId());

        // 4. Insert organisation with NULL slug and a unique name
        Organisation freshOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Seremban Strikers")
                .slug(null)
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .status("Active")
                .deleted(false)
                .build());
        createdOrgIds.add(freshOrg.getId());

        // 5. Execute V170 SQL migration
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                new ClassPathResource("db/migration/V170__backfill_organisation_slugs.sql")
        );
        populator.execute(jdbcTemplate.getDataSource());

        // 6. Assertions
        Organisation reloadedExisting = organisationRepository.findById(existingOrg.getId()).orElseThrow();
        Organisation reloadedClashing = organisationRepository.findById(clashingOrg.getId()).orElseThrow();
        Organisation reloadedBlank = organisationRepository.findById(blankSlugOrg.getId()).orElseThrow();
        Organisation reloadedFresh = organisationRepository.findById(freshOrg.getId()).orElseThrow();

        // Existing slug unchanged
        assertThat(reloadedExisting.getSlug()).isEqualTo("apex-titans-rfc");

        // Clashing slug received '-<id8>' suffix
        String expectedClashSuffix = clashingOrg.getId().toString().substring(0, 8);
        assertThat(reloadedClashing.getSlug()).isEqualTo("apex-titans-rfc-" + expectedClashSuffix);

        // Blank slug backfilled
        assertThat(reloadedBlank.getSlug()).isEqualTo("blank-slugs-association");

        // Fresh slug backfilled
        assertThat(reloadedFresh.getSlug()).isEqualTo("seremban-strikers");

        // No null or blank slugs remain among our created organisations
        for (UUID id : createdOrgIds) {
            Organisation org = organisationRepository.findById(id).orElseThrow();
            assertThat(org.getSlug()).isNotNull().isNotBlank();
        }

        // 7. GET /api/public/organisations/{newSlug} returns 200
        mockMvc.perform(get("/api/public/organisations/" + reloadedFresh.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Seremban Strikers")))
                .andExpect(jsonPath("$.slug", is("seremban-strikers")));

        mockMvc.perform(get("/api/public/organisations/" + reloadedClashing.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Apex Titans RFC")))
                .andExpect(jsonPath("$.slug", is(reloadedClashing.getSlug())));
    }
}
