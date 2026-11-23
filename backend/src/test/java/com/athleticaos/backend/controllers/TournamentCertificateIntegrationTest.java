package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.Certificate;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Person;
import com.athleticaos.backend.entities.Player;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentCategory;
import com.athleticaos.backend.entities.TournamentPlayer;
import com.athleticaos.backend.entities.TournamentTeam;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.CertificateRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.PersonRepository;
import com.athleticaos.backend.repositories.PlayerRepository;
import com.athleticaos.backend.repositories.RoleRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentCategoryRepository;
import com.athleticaos.backend.repositories.TournamentPlayerRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentTeamRepository;
import com.athleticaos.backend.repositories.UserRepository;
import com.athleticaos.backend.support.IntegrationTestUsers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
class TournamentCertificateIntegrationTest {

    private static final String OTHER_ORG_ADMIN = "other-org-admin@cert-test.local";

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
        registry.add("app.certificates.public-base-url", () -> "https://www.athleticaos.com");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private OrganisationRepository organisationRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TournamentRepository tournamentRepository;
    @Autowired private TournamentCategoryRepository categoryRepository;
    @Autowired private TournamentTeamRepository tournamentTeamRepository;
    @Autowired private PersonRepository personRepository;
    @Autowired private PlayerRepository playerRepository;
    @Autowired private TournamentPlayerRepository tournamentPlayerRepository;
    @Autowired private CertificateRepository certificateRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;

    private static boolean seeded = false;
    private static UUID tournamentId;

    @BeforeEach
    void setUp() {
        IntegrationTestUsers.ensureSuperAdmin(userRepository, roleRepository);
        if (seeded) {
            return;
        }

        Organisation organiserOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Johor Rugby Union")
                .slug("cert-test-org")
                .orgType("STATE")
                .build());

        Organisation otherOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Other State Union")
                .slug("cert-test-other-org")
                .orgType("STATE")
                .build());
        IntegrationTestUsers.ensure(userRepository, roleRepository, OTHER_ORG_ADMIN, "ROLE_ORG_ADMIN", otherOrg);

        Tournament tournament = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Johor 7s Cup")
                .slug("johor-7s-cup-cert-test")
                .level("STATE")
                .venue("Stadium Johor")
                .organiserOrg(organiserOrg)
                .startDate(LocalDate.of(2026, 11, 13))
                .endDate(LocalDate.of(2026, 11, 15))
                .isPublished(true)
                .status(TournamentStatus.COMPLETED)
                .build());
        tournamentId = tournament.getId();

        TournamentCategory catMen = categoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(tournament)
                .name("Men Open")
                .gender("MALE")
                .build());
        TournamentCategory catWomen = categoryRepository.saveAndFlush(TournamentCategory.builder()
                .tournament(tournament)
                .name("Women Open")
                .gender("FEMALE")
                .build());

        seedTeamWithPlayers(tournament, organiserOrg, catMen, "Alpha RFC", "ALF", 2, true);
        seedTeamWithPlayers(tournament, organiserOrg, catMen, "Bravo RFC", "BRV", 2, false);
        seedTeamWithPlayers(tournament, organiserOrg, catWomen, "Cedar RFC", "CDR", 2, false);
        seedTeamWithPlayers(tournament, organiserOrg, catWomen, "Delta RFC", "DLT", 2, true);

        seeded = true;
    }

    private void seedTeamWithPlayers(
            Tournament tournament,
            Organisation org,
            TournamentCategory category,
            String teamName,
            String shortName,
            int activeCount,
            boolean addInactivePlayer) {

        Team team = teamRepository.saveAndFlush(Team.builder()
                .name(teamName)
                .shortName(shortName)
                .slug("cert-" + shortName.toLowerCase())
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("JOHOR")
                .build());

        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament)
                .category(category)
                .team(team)
                .isActive(true)
                .deleted(false)
                .build());

        for (int i = 1; i <= activeCount; i++) {
            addPlayerToRoster(tournament, team, teamName + " Player", String.valueOf(i), true);
        }
        if (addInactivePlayer) {
            addPlayerToRoster(tournament, team, teamName + " Inactive", "99", false);
        }
    }

    private void addPlayerToRoster(Tournament tournament, Team team, String firstName, String lastName, boolean active) {
        Person person = personRepository.saveAndFlush(Person.builder()
                .firstName(firstName)
                .lastName(lastName)
                .gender("MALE")
                .dob(LocalDate.of(2000, 1, 1))
                .nationality("Malaysia")
                .build());
        Player player = playerRepository.saveAndFlush(Player.builder()
                .person(person)
                .status("ACTIVE")
                .deleted(false)
                .build());
        tournamentPlayerRepository.saveAndFlush(TournamentPlayer.builder()
                .tournament(tournament)
                .team(team)
                .player(player)
                .isActive(active)
                .isEligible(true)
                .build());
    }

    @Test
    @DisplayName("Issues certificates, streams tournament ZIP with Category/Team/Player structure, excludes inactive players, and keeps codes on re-issue")
    @WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, authorities = { "ROLE_SUPER_ADMIN" })
    void issueAndDownloadTournamentZip() throws Exception {
        // 1. Issue certificates for all active rostered players (2 categories x 2 teams x 2 active = 8; 2 inactive excluded)
        mockMvc.perform(post("/api/v1/tournaments/{id}/certificates/issue", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdCount").value(8))
                .andExpect(jsonPath("$.totalValidCount").value(8));

        Map<UUID, String> codesAfterFirstIssue = new HashMap<>();
        for (Certificate c : certificateRepository.findByTournamentId(tournamentId)) {
            codesAfterFirstIssue.put(c.getPlayer().getId(), c.getCode());
        }
        assertThat(codesAfterFirstIssue).hasSize(8);

        // 2. Re-issuing keeps exact same codes
        mockMvc.perform(post("/api/v1/tournaments/{id}/certificates/issue", tournamentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdCount").value(0))
                .andExpect(jsonPath("$.totalValidCount").value(8));

        for (Certificate c : certificateRepository.findByTournamentId(tournamentId)) {
            assertThat(c.getCode()).isEqualTo(codesAfterFirstIssue.get(c.getPlayer().getId()));
        }

        // 3. Download tournament ZIP (async StreamingResponseBody)
        MvcResult asyncResult = mockMvc.perform(get("/api/v1/tournaments/{id}/certificates/download/zip", tournamentId))
                .andExpect(request().asyncStarted())
                .andReturn();

        MvcResult completed = mockMvc.perform(asyncDispatch(asyncResult))
                .andExpect(status().isOk())
                .andReturn();

        List<String> zipPaths = new ArrayList<>();
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(completed.getResponse().getContentAsByteArray()))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                zipPaths.add(entry.getName());
            }
        }

        assertThat(zipPaths).hasSize(8);
        assertThat(zipPaths).anyMatch(p -> p.startsWith("Men Open/Alpha RFC/") && p.endsWith(".pdf"));
        assertThat(zipPaths).anyMatch(p -> p.startsWith("Men Open/Bravo RFC/") && p.endsWith(".pdf"));
        assertThat(zipPaths).anyMatch(p -> p.startsWith("Women Open/Cedar RFC/") && p.endsWith(".pdf"));
        assertThat(zipPaths).anyMatch(p -> p.startsWith("Women Open/Delta RFC/") && p.endsWith(".pdf"));
        assertThat(zipPaths).noneMatch(p -> p.contains("Inactive"));
    }

    @Test
    @DisplayName("Organiser admin of another organisation is refused with 404")
    @WithMockUser(username = OTHER_ORG_ADMIN, authorities = { "ROLE_ORG_ADMIN" })
    void otherOrganiserIsRefused() throws Exception {
        mockMvc.perform(get("/api/v1/tournaments/{id}/certificates/settings", tournamentId))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/tournaments/{id}/certificates/issue", tournamentId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Revoking a certificate shows REVOKED on the public verification endpoint")
    @WithMockUser(username = IntegrationTestUsers.SUPER_ADMIN, authorities = { "ROLE_SUPER_ADMIN" })
    void revokeShowsOnPublicEndpoint() throws Exception {
        mockMvc.perform(post("/api/v1/tournaments/{id}/certificates/issue", tournamentId))
                .andExpect(status().isOk());

        Certificate target = certificateRepository.findByTournamentId(tournamentId).get(0);

        mockMvc.perform(get("/api/public/certificates/{code}", target.getCode()))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"))
                .andExpect(jsonPath("$.status").value("VALID"))
                .andExpect(jsonPath("$.recipientName").value(target.getRecipientName()));

        mockMvc.perform(post("/api/v1/tournaments/{id}/certificates/{certId}/revoke", tournamentId, target.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED"));

        mockMvc.perform(get("/api/public/certificates/{code}", target.getCode()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVOKED"));
    }
}
