package com.athleticaos.backend.controllers;

import com.athleticaos.backend.entities.Match;
import com.athleticaos.backend.entities.Organisation;
import com.athleticaos.backend.entities.Team;
import com.athleticaos.backend.entities.Tournament;
import com.athleticaos.backend.entities.TournamentStage;
import com.athleticaos.backend.enums.MatchStatus;
import com.athleticaos.backend.enums.TournamentStageType;
import com.athleticaos.backend.enums.TournamentStatus;
import com.athleticaos.backend.repositories.MatchRepository;
import com.athleticaos.backend.repositories.OrganisationRepository;
import com.athleticaos.backend.repositories.TeamRepository;
import com.athleticaos.backend.repositories.TournamentRepository;
import com.athleticaos.backend.repositories.TournamentStageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Tag("integration")
@SuppressWarnings("null")
class TournamentExportIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("athleticaos_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
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
    private TournamentRepository tournamentRepository;

    @Autowired
    private TournamentStageRepository tournamentStageRepository;

    @Autowired
    private MatchRepository matchRepository;

    private static boolean seeded = false;
    private static UUID tournamentId;
    private static UUID match1Id;
    private static UUID match2Id;

    @BeforeEach
    void setUp() {
        if (seeded || organisationRepository.findBySlug("test-export-org").isPresent()) {
            seeded = true;
            return;
        }

        Organisation org = organisationRepository.saveAndFlush(Organisation.builder()
                .name("Test Club Org")
                .slug("test-export-org")
                .orgType("CLUB")
                .build());

        Team teamA = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club A")
                .shortName("TCA")
                .slug("test-export-team-a")
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("SELANGOR")
                .build());

        Team teamB = teamRepository.saveAndFlush(Team.builder()
                .name("Test Club B")
                .shortName("TCB")
                .slug("test-export-team-b")
                .organisation(org)
                .status("Active")
                .category("SENIOR")
                .ageGroup("OPEN")
                .division("DIV_1")
                .state("KUALA_LUMPUR")
                .build());

        Tournament tournament = tournamentRepository.saveAndFlush(Tournament.builder()
                .name("Test Export Cup")
                .slug("test-export-cup")
                .level("NATIONAL")
                .venue("Stadium A")
                .isPublished(true)
                .status(TournamentStatus.PUBLISHED)
                .organiserOrg(org)
                .startDate(LocalDate.of(2026, 9, 20))
                .endDate(LocalDate.of(2026, 9, 22))
                .build());
        tournamentId = tournament.getId();

        TournamentStage stage = tournamentStageRepository.saveAndFlush(TournamentStage.builder()
                .tournament(tournament)
                .name("Pool Stage")
                .stageType(TournamentStageType.POOL)
                .displayOrder(1)
                .isGroupStage(true)
                .isKnockoutStage(false)
                .build());

        Match match1 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(stage)
                .homeTeam(teamA)
                .awayTeam(teamB)
                .matchCode("EXP-001")
                .matchDate(LocalDate.of(2026, 9, 20))
                .kickOffTime(LocalTime.of(10, 0))
                .status(MatchStatus.SCHEDULED)
                .venue("Pitch 1")
                .deleted(false)
                .homeScore(null)
                .awayScore(null)
                .build());
        match1Id = match1.getId();

        Match match2 = matchRepository.saveAndFlush(Match.builder()
                .tournament(tournament)
                .stage(stage)
                .homeTeam(teamB)
                .awayTeam(teamA)
                .matchCode("EXP-002")
                .matchDate(LocalDate.of(2026, 9, 20))
                .kickOffTime(LocalTime.of(14, 30))
                .status(MatchStatus.COMPLETED)
                .venue("Pitch 2")
                .deleted(false)
                .homeScore(24)
                .awayScore(17)
                .build());
        match2Id = match2.getId();

        seeded = true;
    }

    @Test
    @DisplayName("exportMatches returns 200 with matches CSV without scores")
    @WithMockUser(roles = "PLAYER")
    void exportMatches_ShouldReturnCsv_WhenAuthenticated() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/matches", tournamentId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=matches.csv"))
                .andReturn();

        String content = result.getResponse().getContentAsString();
        String[] lines = content.split("\n");
        assertThat(lines).hasSize(3);

        assertThat(lines[0]).isEqualTo("MatchCode,TournamentName,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status");

        assertThat(lines[1]).contains(match1Id.toString());
        assertThat(lines[1]).contains("Test Export Cup");
        assertThat(lines[1]).contains("Pool Stage");
        assertThat(lines[1]).contains("Test Club A");
        assertThat(lines[1]).contains("Test Club B");
        assertThat(lines[1]).contains("2026-09-20");
        assertThat(lines[1]).contains("10:00");
        assertThat(lines[1]).contains("Pitch 1");
        assertThat(lines[1]).contains("SCHEDULED");

        assertThat(lines[2]).contains(match2Id.toString());
        assertThat(lines[2]).contains("Test Export Cup");
        assertThat(lines[2]).contains("Pool Stage");
        assertThat(lines[2]).contains("Test Club B");
        assertThat(lines[2]).contains("Test Club A");
        assertThat(lines[2]).contains("2026-09-20");
        assertThat(lines[2]).contains("14:30");
        assertThat(lines[2]).contains("Pitch 2");
        assertThat(lines[2]).contains("COMPLETED");

        // Assert scores are not present in lines
        assertThat(lines[0]).doesNotContain("HomeScore");
        assertThat(lines[0]).doesNotContain("AwayScore");
    }

    @Test
    @DisplayName("exportResults returns 200 with results CSV including scores")
    @WithMockUser(roles = "PLAYER")
    void exportResults_ShouldReturnCsv_WhenAuthenticated() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/tournaments/{idOrSlug}/export/results", tournamentId))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=results.csv"))
                .andReturn();

        String content = result.getResponse().getContentAsString();
        String[] lines = content.split("\n");
        assertThat(lines).hasSize(3);

        assertThat(lines[0]).isEqualTo("MatchCode,TournamentName,Stage,HomeTeam,AwayTeam,Date,Time,Venue,Status,HomeScore,AwayScore");

        // Line 1: match1 has null scores
        assertThat(lines[1]).contains(match1Id.toString());
        assertThat(lines[1]).contains("Test Export Cup");
        assertThat(lines[1]).contains("Pool Stage");
        assertThat(lines[1]).contains("Test Club A");
        assertThat(lines[1]).contains("Test Club B");
        assertThat(lines[1]).contains("SCHEDULED");

        // Line 2: match2 has scores 24 and 17
        assertThat(lines[2]).contains(match2Id.toString());
        assertThat(lines[2]).contains("Test Export Cup");
        assertThat(lines[2]).contains("Pool Stage");
        assertThat(lines[2]).contains("Test Club B");
        assertThat(lines[2]).contains("Test Club A");
        assertThat(lines[2]).contains("COMPLETED");
        assertThat(lines[2]).endsWith("24,17");
    }
}
