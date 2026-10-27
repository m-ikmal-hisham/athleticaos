package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.OrganisationLevel;
import com.athleticaos.backend.repositories.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
public class PublicOrganisationIntegrationTest {

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
    private PlayerRepository playerRepository;

    @Autowired
    private PersonRepository personRepository;

    @Autowired
    private PlayerTeamRepository playerTeamRepository;

    @Autowired
    private TournamentRepository tournamentRepository;

    private Organisation national;
    private Organisation state;
    private Organisation division;
    private Organisation club;
    private Organisation inactiveOrg;
    private Organisation deletedOrg;
    private Organisation sluglessClub;
    private Team team1;
    private Team inactiveTeam;
    private Player player1;
    private Person person1;
    private PlayerTeam playerTeam1;
    private Organisation inactiveParent;

    // The Testcontainers database is shared with the other integration test classes, so this class only
    // removes the rows it created (no deleteAll), children first.
    @AfterEach
    void tearDown() {
        if (playerTeam1 != null) playerTeamRepository.deleteById(playerTeam1.getId());
        if (player1 != null) playerRepository.deleteById(player1.getId());
        if (person1 != null) personRepository.deleteById(person1.getId());
        for (Team t : new Team[] { team1, inactiveTeam }) {
            if (t != null) teamRepository.deleteById(t.getId());
        }
        for (Organisation o : new Organisation[] { club, sluglessClub, deletedOrg, inactiveOrg, division, state, inactiveParent, national }) {
            if (o != null) organisationRepository.deleteById(o.getId());
        }
    }

    @BeforeEach
    void setUp() {

        // Level 1: National
        national = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Malaysia Rugby Union")
                .slug("malaysia-rugby-union")
                .orgType("UNION")
                .orgLevel(OrganisationLevel.COUNTRY)
                .status("Active")
                .deleted(false)
                .state("Kuala Lumpur")
                .addressLine1("Jalan Hang Jebat")
                .city("Kuala Lumpur")
                .postcode("50150")
                .primaryColor("#002B49")
                .secondaryColor("#E03A3E")
                .build());

        // Level 2: State
        state = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Selangor Rugby Union")
                .slug("selangor-rugby-union")
                .orgType("UNION")
                .orgLevel(OrganisationLevel.STATE)
                .parentOrg(national)
                .status("Active")
                .deleted(false)
                .state("Selangor")
                .primaryColor("#CC0000")
                .secondaryColor("#FFCC00")
                .build());

        // Level 3: Division
        division = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Petaling District Rugby")
                .slug("petaling-district-rugby")
                .orgType("ASSOCIATION")
                .orgLevel(OrganisationLevel.DISTRICT)
                .parentOrg(state)
                .status("Active")
                .deleted(false)
                .state("Selangor")
                .build());

        // Level 4: Club
        club = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Cobra Rugby Club")
                .slug("cobra-rugby-club")
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .parentOrg(division)
                .status("Active")
                .deleted(false)
                .state("Selangor")
                .primaryColor("#000000")
                .secondaryColor("#FFCC00")
                .build());

        // Slug-less Club with an inactive parent (tests prompt item 3 & 4)
        inactiveParent = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Hidden Parent Association")
                .slug("hidden-parent-assoc")
                .orgType("ASSOCIATION")
                .orgLevel(OrganisationLevel.STATE)
                .status("Inactive")
                .deleted(false)
                .build());

        sluglessClub = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Slugless Pioneers RFC")
                .slug(null)
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .parentOrg(inactiveParent)
                .status("Active")
                .deleted(false)
                .state("Johor")
                .build());

        // Inactive and Deleted organisations
        inactiveOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Inactive Rugby Union")
                .slug("inactive-rugby-union")
                .orgType("UNION")
                .orgLevel(OrganisationLevel.STATE)
                .parentOrg(national)
                .status("Inactive")
                .deleted(false)
                .build());

        deletedOrg = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Deleted Rugby Club")
                .slug("deleted-rugby-club")
                .orgType("CLUB")
                .orgLevel(OrganisationLevel.CLUB)
                .parentOrg(state)
                .status("Active")
                .deleted(true)
                .build());

        // Teams
        team1 = teamRepository.saveAndFlush(Team.builder()
                .name("Cobra Black")
                .slug("cobra-black")
                .organisation(club)
                .category("MENS")
                .ageGroup("SENIOR")
                .division("Premier")
                .status("Active")
                .build());

        inactiveTeam = teamRepository.saveAndFlush(Team.builder()
                .name("Cobra Inactive")
                .slug("cobra-inactive")
                .organisation(club)
                .category("MENS")
                .ageGroup("SENIOR")
                .status("Inactive")
                .build());

        // Person & Player
        person1 = personRepository.saveAndFlush(Person.builder()
                .firstName("Syed")
                .lastName("Ibrahim")
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .dob(LocalDate.of(2000, 1, 1))
                .state("Selangor")
                .registrationNo("AOS-P001")
                .build());

        player1 = playerRepository.saveAndFlush(Player.builder()
                .person(person1)
                .slug("syed-ibrahim")
                .status("ACTIVE")
                .deleted(false)
                .build());

        playerTeam1 = playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(player1)
                .team(team1)
                .isActive(true)
                .position("Fly-half")
                .jerseyNumber(10)
                .build());
    }

    @Test
    @DisplayName("GET /api/public/organisations/tree returns full 4-level hierarchy and hides inactive/deleted")
    void getTree_fourLevelsAndHidesInactive() throws Exception {
        mockMvc.perform(get("/api/public/organisations/tree"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organisations[*].name", hasItems(
                        "Malaysia Rugby Union",
                        "Selangor Rugby Union",
                        "Petaling District Rugby",
                        "Cobra Rugby Club",
                        "Slugless Pioneers RFC"
                )))
                .andExpect(jsonPath("$.organisations[*].name", not(hasItems(
                        "Inactive Rugby Union",
                        "Deleted Rugby Club",
                        "Hidden Parent Association"
                ))))
                .andExpect(jsonPath("$.teams[*].name", hasItem("Cobra Black")))
                .andExpect(jsonPath("$.teams[*].name", not(hasItem("Cobra Inactive"))))
                // Active org whose parent is inactive shows parentId null in tree
                .andExpect(jsonPath("$.organisations[?(@.name == 'Slugless Pioneers RFC')].parentId", contains(nullValue())))
                // Privacy: no address fields
                .andExpect(jsonPath("$.organisations[*].addressLine1").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].city").doesNotExist())
                .andExpect(jsonPath("$.organisations[*].postcode").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/public/organisations/{slug} resolves detail with 4-level parent chain and counts")
    void getDetail_parentChainAndCounts() throws Exception {
        mockMvc.perform(get("/api/public/organisations/cobra-rugby-club"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Cobra Rugby Club")))
                .andExpect(jsonPath("$.parentChain", hasSize(3)))
                .andExpect(jsonPath("$.parentChain[0].name", is("Petaling District Rugby")))
                .andExpect(jsonPath("$.parentChain[1].name", is("Selangor Rugby Union")))
                .andExpect(jsonPath("$.parentChain[2].name", is("Malaysia Rugby Union")))
                .andExpect(jsonPath("$.teams", hasSize(1)))
                .andExpect(jsonPath("$.teams[0].name", is("Cobra Black")))
                .andExpect(jsonPath("$.counts.teams", is(1)))
                .andExpect(jsonPath("$.counts.players", is(1)))
                .andExpect(jsonPath("$.addressLine1").doesNotExist())
                .andExpect(jsonPath("$.city").doesNotExist())
                .andExpect(jsonPath("$.postcode").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/public/organisations/{id} allows slug-less lookup; stops parent chain at non-public parent")
    void getDetail_sluglessAndNonPublicParentStop() throws Exception {
        mockMvc.perform(get("/api/public/organisations/" + sluglessClub.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Slugless Pioneers RFC")))
                .andExpect(jsonPath("$.slug").value(nullValue()))
                // Parent chain stops because parent is Inactive
                .andExpect(jsonPath("$.parentChain", hasSize(0)));
    }

    @Test
    @DisplayName("Team detail and player detail include organisation and affiliation chain")
    void teamAndPlayerDetail_includeOrganisationAndAffiliation() throws Exception {
        // Team detail
        mockMvc.perform(get("/api/public/teams/" + team1.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Cobra Black")))
                .andExpect(jsonPath("$.organisation.name", is("Cobra Rugby Club")))
                .andExpect(jsonPath("$.affiliation", hasSize(3)))
                .andExpect(jsonPath("$.affiliation[0].name", is("Petaling District Rugby")))
                .andExpect(jsonPath("$.affiliation[2].name", is("Malaysia Rugby Union")));

        // Player detail
        mockMvc.perform(get("/api/public/players/" + player1.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", is("Syed")))
                .andExpect(jsonPath("$.organisation.name", is("Cobra Rugby Club")))
                .andExpect(jsonPath("$.affiliation", hasSize(3)))
                .andExpect(jsonPath("$.affiliation[0].name", is("Petaling District Rugby")))
                .andExpect(jsonPath("$.affiliation[2].name", is("Malaysia Rugby Union")));
    }
}
