package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.repositories.*;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
public class AdminDirectoryIntegrationTest {

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
    private TeamRepository teamRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerTeamRepository playerTeamRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private static boolean seeded = false;
    private static UUID orgAId;
    private static UUID orgBId;
    private static UUID teamA1Id;
    private static UUID teamA2Id;
    private static UUID teamB1Id;

    @BeforeEach
    void setUp() {
        if (seeded || organisationRepository.findBySlug("admin-test-org-a").isPresent()) {
            Organisation oa = organisationRepository.findBySlug("admin-test-org-a").orElse(null);
            if (oa != null) orgAId = oa.getId();
            Organisation ob = organisationRepository.findBySlug("admin-test-org-b").orElse(null);
            if (ob != null) orgBId = ob.getId();
            seeded = true;
            return;
        }

        // 1. Roles
        Role clubAdminRole = roleRepository.findByName("ROLE_CLUB_ADMIN")
                .orElseGet(() -> roleRepository.saveAndFlush(Role.builder().name("ROLE_CLUB_ADMIN").build()));

        // 2. Organisations
        Organisation orgA = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Admin Test Org A")
                .orgType("CLUB")
                .slug("admin-test-org-a")
                .build());
        orgAId = orgA.getId();

        Organisation orgB = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Admin Test Org B")
                .orgType("CLUB")
                .slug("admin-test-org-b")
                .build());
        orgBId = orgB.getId();

        // 3. Org Admin Users
        userRepository.saveAndFlush(User.builder()
                .email("orgadmin.a@athleticaos.test")
                .passwordHash("$2a$10$IF2iAWF9TErRu3XbOc8rJel14a0VMuaqQEUEx554qb6x/ftUIO0m.")
                .firstName("Admin")
                .lastName("OrgA")
                .organisation(orgA)
                .roles(Set.of(clubAdminRole))
                .isActive(true)
                .build());

        // 4. Teams
        Team teamA1 = teamRepository.saveAndFlush(Team.builder()
                .name("Alpha Hawks")
                .shortName("AH")
                .slug("alpha-hawks")
                .organisation(orgA)
                .status("Active")
                .category("Men")
                .ageGroup("Senior")
                .division("Div 1")
                .state("Selangor")
                .build());
        teamA1Id = teamA1.getId();

        Team teamA2 = teamRepository.saveAndFlush(Team.builder()
                .name("Alpha Valkyries")
                .shortName("AV")
                .slug("alpha-valkyries")
                .organisation(orgA)
                .status("Active")
                .category("Women")
                .ageGroup("Senior")
                .division("Div 1")
                .state("Selangor")
                .build());
        teamA2Id = teamA2.getId();

        Team teamB1 = teamRepository.saveAndFlush(Team.builder()
                .name("Beta Wolves")
                .shortName("BW")
                .slug("beta-wolves")
                .organisation(orgB)
                .status("Active")
                .category("Men")
                .ageGroup("Under-18")
                .division("Div 2")
                .state("Kuala Lumpur")
                .build());
        teamB1Id = teamB1.getId();

        // 5. Persons & Players
        // Player 1 in Org A: Active, Ahmad Albab
        Person person1 = personRepository.saveAndFlush(Person.builder()
                .firstName("Ahmad")
                .lastName("Albab")
                .email("ahmad.albab@test.com")
                .dob(LocalDate.of(1995, 5, 10))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());
        Player player1 = playerRepository.saveAndFlush(Player.builder()
                .person(person1)
                .slug("ahmad-albab")
                .status("ACTIVE")
                .deleted(false)
                .build());
        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player1)
                .team(teamA1)
                .isActive(true)
                .build());

        // Player 2 in Org A: Inactive, Abu Bakar
        Person person2 = personRepository.saveAndFlush(Person.builder()
                .firstName("Abu")
                .lastName("Bakar")
                .email("abu.bakar@test.com")
                .dob(LocalDate.of(1996, 6, 12))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());
        Player player2 = playerRepository.saveAndFlush(Player.builder()
                .person(person2)
                .slug("abu-bakar")
                .status("INACTIVE")
                .deleted(false)
                .build());
        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player2)
                .team(teamA2)
                .isActive(true)
                .build());

        // Player 3 in Org A: Deleted = true, Ali Baba
        Person person3 = personRepository.saveAndFlush(Person.builder()
                .firstName("Ali")
                .lastName("Baba")
                .email("ali.baba@test.com")
                .dob(LocalDate.of(1997, 7, 14))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());
        Player player3 = playerRepository.saveAndFlush(Player.builder()
                .person(person3)
                .slug("ali-baba")
                .status("ACTIVE")
                .deleted(true)
                .build());
        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player3)
                .team(teamA1)
                .isActive(true)
                .build());

        // Player 4 in Org B: Active, Charlie Brown
        Person person4 = personRepository.saveAndFlush(Person.builder()
                .firstName("Charlie")
                .lastName("Brown")
                .email("charlie.brown@test.com")
                .dob(LocalDate.of(1998, 8, 16))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());
        Player player4 = playerRepository.saveAndFlush(Player.builder()
                .person(person4)
                .slug("charlie-brown")
                .status("ACTIVE")
                .deleted(false)
                .build());
        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player4)
                .team(teamB1)
                .isActive(true)
                .build());

        seeded = true;
    }

    @Test
    @DisplayName("Super admin sees all non-deleted players across organisations")
    @WithMockUser(username = "admin@athleticaos.com", roles = "SUPER_ADMIN")
    void testSuperAdminSeesAllPlayers() throws Exception {
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(3)))
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[*].firstName", hasItems("Ahmad", "Abu", "Charlie")))
                .andExpect(jsonPath("$.items[*].firstName", not(hasItem("Ali")))); // Deleted player excluded
    }

    @Test
    @DisplayName("Org admin sees only players within own organisation hierarchy")
    @WithMockUser(username = "orgadmin.a@athleticaos.test", roles = "CLUB_ADMIN")
    void testOrgAdminSeesOnlyOwnPlayers() throws Exception {
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(2)))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].firstName", hasItems("Ahmad", "Abu")))
                .andExpect(jsonPath("$.items[*].firstName", not(hasItem("Charlie")))); // Org B player excluded

        // Status counts also scoped
        mockMvc.perform(get("/api/v1/players/status-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ACTIVE", is(1)))
                .andExpect(jsonPath("$.INACTIVE", is(1)))
                .andExpect(jsonPath("$.ALL", is(2)));
    }

    @Test
    @DisplayName("Player search by name, first+last, and email")
    @WithMockUser(username = "admin@athleticaos.com", roles = "SUPER_ADMIN")
    void testPlayerSearch() throws Exception {
        // By first name
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "Ahmad"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].firstName", is("Ahmad")));

        // By last name
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "Albab"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].lastName", is("Albab")));

        // By "first last"
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "Ahmad Albab"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].firstName", is("Ahmad")));

        // By email
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "24")
                        .param("search", "charlie.brown@test.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].firstName", is("Charlie")));
    }

    @Test
    @DisplayName("Player pagination boundaries and size clamping")
    @WithMockUser(username = "admin@athleticaos.com", roles = "SUPER_ADMIN")
    void testPlayerPagingAndSizeClamping() throws Exception {
        // size = 1
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(1)))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.totalItems", is(3)))
                .andExpect(jsonPath("$.totalPages", is(3)))
                .andExpect(jsonPath("$.hasNext", is(true)));

        // size = 0 clamped to 1
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(1)));

        // size = 500 clamped to 100
        mockMvc.perform(get("/api/v1/players")
                        .param("page", "0")
                        .param("size", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(100)));
    }

    @Test
    @DisplayName("Super admin vs org admin for teams, filters, and category counts")
    @WithMockUser(username = "admin@athleticaos.com", roles = "SUPER_ADMIN")
    void testSuperAdminTeams() throws Exception {
        mockMvc.perform(get("/api/v1/teams")
                        .param("page", "0")
                        .param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(3)))
                .andExpect(jsonPath("$.items", hasSize(3)));

        mockMvc.perform(get("/api/v1/teams/category-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.MEN", is(2)))
                .andExpect(jsonPath("$.WOMEN", is(1)))
                .andExpect(jsonPath("$.ALL", is(3)));

        mockMvc.perform(get("/api/v1/teams/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organisations", hasSize(2)))
                .andExpect(jsonPath("$.categories", containsInAnyOrder("Men", "Women")))
                .andExpect(jsonPath("$.states", containsInAnyOrder("Selangor", "Kuala Lumpur")));

        // Search team
        mockMvc.perform(get("/api/v1/teams")
                        .param("page", "0")
                        .param("search", "Valkyries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].name", is("Alpha Valkyries")));

        // Category filter
        mockMvc.perform(get("/api/v1/teams")
                        .param("page", "0")
                        .param("category", "Women"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(1)))
                .andExpect(jsonPath("$.items[0].name", is("Alpha Valkyries")));
    }

    @Test
    @DisplayName("Org admin sees only own teams, filters, and category counts")
    @WithMockUser(username = "orgadmin.a@athleticaos.test", roles = "CLUB_ADMIN")
    void testOrgAdminTeams() throws Exception {
        mockMvc.perform(get("/api/v1/teams")
                        .param("page", "0")
                        .param("size", "24"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems", is(2)))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].name", not(hasItem("Beta Wolves"))));

        mockMvc.perform(get("/api/v1/teams/category-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.MEN", is(1)))
                .andExpect(jsonPath("$.WOMEN", is(1)))
                .andExpect(jsonPath("$.ALL", is(2)));

        mockMvc.perform(get("/api/v1/teams/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organisations", hasSize(1)))
                .andExpect(jsonPath("$.organisations[0].name", is("Admin Test Org A")))
                .andExpect(jsonPath("$.states", containsInAnyOrder("Selangor")));
    }
}
