package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.*;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
class PublicLazyLoadingIntegrationTest {

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
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentTeamRepository tournamentTeamRepository;

    @Autowired
    private TournamentPlayerRepository tournamentPlayerRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private OfficialRegistryRepository officialRegistryRepository;

    @Autowired
    private MatchOfficialRepository matchOfficialRepository;

    private static boolean seeded = false;
    private static UUID tournamentId;
    private static String tournamentSlug;
    private static UUID teamAId;
    private static String teamASlug;
    private static UUID playerAId;
    private static String playerASlug;
    private static UUID matchId;

    @BeforeEach
    void setUp() {
        if (seeded || organisationRepository.findBySlug("test-club-a-org").isPresent()) {
            seeded = true;
            return;
        }

        // 1. Two organisations
        Organisation orgA = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Test Club A Org")
                .orgType("CLUB")
                .slug("test-club-a-org")
                .build());

        Organisation orgB = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Test Club B Org")
                .orgType("CLUB")
                .slug("test-club-b-org")
                .build());

        // 2. Two teams
        Team teamA = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club A")
                .shortName("TCA")
                .slug("test-club-a")
                .organisation(orgA)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("SELANGOR")
                .build());
        teamAId = teamA.getId();
        teamASlug = teamA.getSlug();

        Team teamB = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club B")
                .shortName("TCB")
                .slug("test-club-b")
                .organisation(orgB)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("KUALA_LUMPUR")
                .build());

        // 3. Persons and Players
        Person personA = personRepository.saveAndFlush(Person.builder()
                .firstName("Player")
                .lastName("A")
                .email("player.a@example.test")
                .dob(LocalDate.of(2000, 1, 1))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());

        Player playerA = playerRepository.saveAndFlush(Player.builder()
                .person(personA)
                .slug("player-a")
                .status("ACTIVE")
                .deleted(false)
                .build());
        playerAId = playerA.getId();
        playerASlug = playerA.getSlug();

        Person personB = personRepository.saveAndFlush(Person.builder()
                .firstName("Player")
                .lastName("B")
                .email("player.b@example.test")
                .dob(LocalDate.of(2001, 2, 2))
                .gender("MALE")
                .nationality("MALAYSIAN")
                .recordVerificationStatus("UNVERIFIED")
                .build());

        Player playerB = playerRepository.saveAndFlush(Player.builder()
                .person(personB)
                .slug("player-b")
                .status("ACTIVE")
                .deleted(false)
                .build());

        // 4. PlayerTeam rows
        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(playerA)
                .team(teamA)
                .position("Fly-half")
                .jerseyNumber(10)
                .isActive(true)
                .build());

        playerTeamRepository.saveAndFlush(PlayerTeam.builder()
                .player(playerB)
                .team(teamB)
                .position("Scrum-half")
                .jerseyNumber(9)
                .isActive(true)
                .build());

        // 5. Tournament
        Tournament tournament = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Test Tournament")
                .slug("test-tournament")
                .level("NATIONAL")
                .venue("National Stadium")
                .bannerUrl("/uploads/banners/test-banner.png")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(orgA)
                .startDate(LocalDate.now().minusDays(2))
                .endDate(LocalDate.now().plusDays(2))
                .build());
        tournamentId = tournament.getId();
        tournamentSlug = tournament.getSlug();

        // 6. TournamentTeam and TournamentPlayer
        tournamentTeamRepository.saveAndFlush(TournamentTeam.builder()
                .tournament(tournament)
                .team(teamA)
                .isActive(true)
                .deleted(false)
                .build());

        tournamentPlayerRepository.saveAndFlush(TournamentPlayer.builder()
                .tournament(tournament)
                .team(teamA)
                .player(playerA)
                .isActive(true)
                .build());

        // 7. Match and MatchOfficial
        Match match = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchCode("M-900001")
                .matchDate(LocalDate.now())
                .kickOffTime(java.time.LocalTime.of(15, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Pitch 1")
                .build());
        matchId = match.getId();

        OfficialRegistry officialRegistry = officialRegistryRepository.saveAndFlush(OfficialRegistry.builder()
                .person(personA)
                .organisation(orgA)
                .accreditationLevel("LEVEL_1")
                .primaryRole("REFEREE")
                .badgeNumber("REF-900001")
                .isActive(true)
                .build());

        matchOfficialRepository.saveAndFlush(MatchOfficial.builder()
                .match(match)
                .official(officialRegistry)
                .assignedRole("REFEREE")
                .isConfirmed(true)
                .build());

        seeded = true;
    }

    @Test
    @DisplayName("GET /api/public/teams returns 200 with populated organisationName, and supports ?tournamentId=")
    void getPublicTeams_reproducesLazyLoading() throws Exception {
        // Without tournamentId
        mockMvc.perform(get("/api/public/teams")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].organisationName", notNullValue()));

        // With tournamentId
        mockMvc.perform(get("/api/public/teams")
                        .param("tournamentId", tournamentId.toString())
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].organisationName", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/public/teams/{slug} and /{id} return 200; unknown returns 404; stats returns 200")
    void getPublicTeam_detailAndStats() throws Exception {
        mockMvc.perform(get("/api/public/teams/" + teamASlug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", equalTo("Test Club A")));

        mockMvc.perform(get("/api/public/teams/" + teamAId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", equalTo("Test Club A")));

        mockMvc.perform(get("/api/public/teams/non-existent-team-slug"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/public/teams/" + teamAId + "/stats"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/public/players returns 200 with/without ?tournamentId=; detail returns 200; unknown returns 404")
    void getPublicPlayers_reproducesLazyLoading() throws Exception {
        mockMvc.perform(get("/api/public/players"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        mockMvc.perform(get("/api/public/players")
                        .param("tournamentId", tournamentId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())));

        mockMvc.perform(get("/api/public/players/" + playerASlug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", equalTo("Player")))
                .andExpect(jsonPath("$.bloodGroup").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactName").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactNumber").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactRelationship").doesNotExist());

        mockMvc.perform(get("/api/public/players/" + playerAId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName", equalTo("Player")))
                .andExpect(jsonPath("$.bloodGroup").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactName").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactNumber").doesNotExist())
                .andExpect(jsonPath("$.emergencyContactRelationship").doesNotExist());

        mockMvc.perform(get("/api/public/players/non-existent-player-slug"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET public tournaments and matches return 200; unknown return 404")
    void getPublicTournamentsAndMatches() throws Exception {
        mockMvc.perform(get("/api/public/tournaments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].bannerUrl", endsWith("/uploads/banners/test-banner.png")));

        mockMvc.perform(get("/api/public/tournaments/" + tournamentSlug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", equalTo("Test Tournament")))
                .andExpect(jsonPath("$.bannerUrl", endsWith("/uploads/banners/test-banner.png")));

        mockMvc.perform(get("/api/public/tournaments/" + tournamentSlug + "/matches"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/tournaments/" + tournamentSlug + "/standings"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/tournaments/" + tournamentSlug + "/stats"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/matches/" + matchId))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/matches/" + matchId + "/lineups"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/tournaments/unknown-tournament-slug"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/public/matches/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Public team and player responses contain no private fields (email, phone, registrationNo, dob)")
    void publicLists_privacyAssertions() throws Exception {
        MvcResult teamsResult = mockMvc.perform(get("/api/public/teams"))
                .andExpect(status().isOk())
                .andReturn();
        String teamsBody = teamsResult.getResponse().getContentAsString();
        assertThat(teamsBody).doesNotContain("\"email\"")
                .doesNotContain("\"phone\"")
                .doesNotContain("\"registrationNo\"")
                .doesNotContain("\"dob\"");

        MvcResult playersResult = mockMvc.perform(get("/api/public/players"))
                .andExpect(status().isOk())
                .andReturn();
        String playersBody = playersResult.getResponse().getContentAsString();
        assertThat(playersBody).doesNotContain("\"email\"")
                .doesNotContain("\"phone\"")
                .doesNotContain("\"registrationNo\"")
                .doesNotContain("\"dob\"");
    }
}
